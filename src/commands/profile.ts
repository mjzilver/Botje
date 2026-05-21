import type { ICommand, IBotContext } from "../interfaces";
import { EmbedBuilder, isGuildMessage } from "../interfaces/discord";
import type { BotMessage } from "../interfaces/discord";
import { extractTopics } from "../systems/topicExtractor";

const PROFILE_FETCH_LIMIT = 5000;
const PROFILE_SAMPLE_SIZE = 500;
const PROFILE_MONTHS = 6;
const MIN_MESSAGES = 10;

export const PROFILE_LOOKBACK_MS = PROFILE_MONTHS * 30 * 24 * 60 * 60 * 1000;

const NEGATIVE_RE =
    /\b(hate|hates|suck|sucks|dislike|dislikes|awful|terrible|worst|boring|annoying|stupid|dumb)\b/i;

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

export function deriveNegativeTopics(rows: MessageRow[], stopWords: Set<string>): string[] {
    const negativeRows = rows.filter((r) => NEGATIVE_RE.test(r.message));
    if (negativeRows.length === 0) return [];

    const freq = new Map<string, number>();
    for (const r of negativeRows) {
        const words = r.message
            .toLowerCase()
            .replace(/[^a-z ]/g, " ")
            .split(/\s+/)
            .filter((w) => w.length >= 4 && !stopWords.has(w) && !NEGATIVE_RE.test(w));
        for (const w of words) freq.set(w, (freq.get(w) ?? 0) + 1);
    }

    return [...freq.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([w]) => w);
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

        const topics = await extractTopics(
            rows.map((r) => ({ cleanContent: r.message })),
            context.database,
            context.dictionary,
            context.config.prefix,
        );

        const dislikes = deriveNegativeTopics(rows, context.dictionary.getStopWords());

        const fields: { name: string; value: string }[] = [
            { name: "Interests", value: topics.slice(0, 3).join(", ") || "None detected" },
        ];
        if (dislikes.length > 0) fields.push({ name: "Possible dislikes", value: dislikes.join(", ") });

        const color = parseInt(context.config.color_hex.replace("#", ""), 16);
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`Profile: ${displayName}`)
            .addFields(...fields)
            .setFooter({ text: `Based on ${rows.length} of ${allRows.length} messages` });

        context.messageHandler.send(message, { embeds: [embed] });
    },
} satisfies ICommand;
