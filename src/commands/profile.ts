import type { ICommand, IBotContext } from "../interfaces";
import { EmbedBuilder, isGuildMessage } from "../interfaces/discord";
import type { BotMessage } from "../interfaces/discord";
import { colorHex } from "../systems/stringHelpers";
import { scoreMessages } from "../systems/sentimentAnalyser";

const PROFILE_FETCH_LIMIT = 10000;
const PROFILE_SAMPLE_SIZE = 2000;
const PROFILE_MONTHS = 6;
const MIN_MESSAGES = 10;

export const PROFILE_LOOKBACK_MS = PROFILE_MONTHS * 30 * 24 * 60 * 60 * 1000;

export type MessageRow = { message: string; datetime: string };

export function sampleMessages(rows: MessageRow[], size: number): MessageRow[] {
    if (rows.length <= size) return rows;
    const copy = rows.slice();
    for (let i = 0; i < size; i++) {
        const j = i + Math.floor(Math.random() * (copy.length - i));
        [copy[i], copy[j]] = [copy[j], copy[i]];
    }

    return copy.slice(0, size);
}

export default {
    name: "profile",
    description: "Shows interests and dislikes for you or a mentioned user",
    format: "profile (@user)",
    async function(message: BotMessage, context: IBotContext): Promise<void> {
        if (!isGuildMessage(message)) {
            context.messageHandler.reply(message, "This command can only be used in a server.");

            return;
        }

        const targetUser = message.mentions.users.first() ?? message.author;

        const allRows = await context.database.query<MessageRow>(
            `SELECT message, datetime FROM messages
            WHERE server_id = $1 AND user_id = $2
            AND message NOT LIKE '%http%' AND message NOT LIKE '%<%'
            AND LENGTH(message) > 3
            AND datetime > $3
            ORDER BY datetime DESC LIMIT $4`,
            [message.guild.id, targetUser.id, Date.now() - PROFILE_LOOKBACK_MS, PROFILE_FETCH_LIMIT],
        );

        const displayName = await context.userHandler.getDisplayName(targetUser.id, message.guild.id);

        if (allRows.length < MIN_MESSAGES) {
            context.messageHandler.reply(
                message,
                `Not enough messages found for \`${displayName}\` to build a profile.`,
            );

            return;
        }

        const rows = sampleMessages(allRows, PROFILE_SAMPLE_SIZE);
        const stopWords = context.dictionary.getStopWords();
        const { likes, dislikes } = scoreMessages(rows.map((r) => r.message), stopWords);

        const fields: { name: string; value: string }[] = [
            { name: "Likes", value: likes.slice(0, 3).join(", ") || "Nothing found" },
        ];

        if (dislikes.length > 0) fields.push({ name: "Dislikes", value: dislikes.slice(0, 3).join(", ") });

        const color = colorHex(context.config.color_hex);
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`Profile: ${displayName}`)
            .addFields(...fields);

        context.messageHandler.send(message, { embeds: [embed] });
    },
} satisfies ICommand;
