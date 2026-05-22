import type { ICommand } from "../interfaces";
import { EmbedBuilder, isGuildMessage } from "../interfaces/discord";
import { toError } from "../systems/utils";
import { formatDate } from "../systems/stringHelpers";

type SourceRow = { user_id: string; message: string; datetime: string };
type CountRow = { user_id: string; times: string; sample: string; last_seen: string };

export default {
    name: "who",
    description: "traces the origin of a message by reply or keyword search",
    format: "who | who [text]",
    async function(message, context) {
        if (!isGuildMessage(message)) {
            context.messageHandler.reply(message, "This command can only be used in a server.");

            return;
        }

        const args = message.content.split(/\s+/).slice(1);
        const color = parseInt(context.config.color_hex.replace("#", ""), 16);

        if (args.length === 0 && message.reference?.messageId) {
            await handleReplyLookup(message, context, color);

            return;
        }

        const searchText = args.join(" ").trim();

        if (!searchText) {
            context.messageHandler.reply(message, "Usage: `!who <text>` or reply to a bot message with `!who`.");

            return;
        }

        await handleTextSearch(message, context, searchText, color);
    },
} satisfies ICommand;

async function handleReplyLookup(
    message: Parameters<ICommand["function"]>[0] & { guild: NonNullable<Parameters<ICommand["function"]>[0]["guild"]> },
    context: Parameters<ICommand["function"]>[1],
    color: number,
): Promise<void> {
    let repliedContent: string;

    try {
        const replied = await message.channel.messages.fetch(message.reference!.messageId!);
        repliedContent = replied.content.trim();
    } catch (err) {
        context.logger.error(toError(err));
        context.messageHandler.reply(message, "Couldn't read the message you replied to.");

        return;
    }

    if (!repliedContent) {
        context.messageHandler.reply(message, "That message has no text content to look up.");

        return;
    }

    try {
        const rows = await context.database.query<SourceRow>(
            `SELECT user_id::text, message, datetime::text
             FROM messages
             WHERE message = $1
             ORDER BY datetime ASC
             LIMIT 10`,
            [repliedContent],
        );

        if (rows.length === 0) {
            context.messageHandler.reply(message, "That message was generated — it has no stored source.");

            return;
        }

        if (rows.length === 1) {
            const row = rows[0];
            const authorName = await context.userHandler.getDisplayName(row.user_id, message.guild.id);
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle("✍️ Original source")
                .setDescription(`> ${row.message}`)
                .setFooter({ text: `${authorName} · ${formatDate(parseInt(row.datetime, 10))}` });

            context.messageHandler.send(message, embed);

            return;
        }

        const names = await Promise.all(
            rows.map((r) => context.userHandler.getDisplayName(r.user_id, message.guild.id)),
        );
        const list = rows.map((r, i) => `**${names[i]}** · ${formatDate(parseInt(r.datetime, 10))}`).join("\n");
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle("✍️ Multiple sources")
            .setDescription(`> ${repliedContent}`)
            .addFields({ name: "Said by", value: list });

        context.messageHandler.send(message, embed);
    } catch (err) {
        context.logger.error(toError(err));
    }
}

async function handleTextSearch(
    message: Parameters<ICommand["function"]>[0] & { guild: NonNullable<Parameters<ICommand["function"]>[0]["guild"]> },
    context: Parameters<ICommand["function"]>[1],
    searchText: string,
    color: number,
): Promise<void> {
    try {
        const countRows = await context.database.query<CountRow>(
            `SELECT user_id::text, COUNT(*) AS times, MAX(message) AS sample, MAX(datetime)::text AS last_seen
             FROM messages
             WHERE message ILIKE $1
             GROUP BY user_id
             ORDER BY times DESC
             LIMIT 20`,
            [`%${searchText}%`],
        );

        if (countRows.length === 0) {
            context.messageHandler.reply(message, `No messages found matching **"${searchText}"**.`);

            return;
        }

        const totalTimes = countRows.reduce((sum, r) => sum + parseInt(r.times, 10), 0);

        if (totalTimes === 1) {
            const row = countRows[0];
            const authorName = await context.userHandler.getDisplayName(row.user_id, message.guild.id);
            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle("🔍 Found it")
                .setDescription(`> ${row.sample}`)
                .setFooter({ text: `${authorName} · ${formatDate(parseInt(row.last_seen, 10))}` });

            context.messageHandler.send(message, embed);

            return;
        }

        const medals = ["🥇", "🥈", "🥉"];
        const names = await Promise.all(
            countRows.map((r) => context.userHandler.getDisplayName(r.user_id, message.guild.id)),
        );
        const lines = countRows.map((r, i) => {
            const medal = i < medals.length ? medals[i] : "▪️";
            const times = parseInt(r.times, 10);

            return `${medal} **${names[i]}** — ${times} time${times === 1 ? "" : "s"}`;
        });

        const shortQuery = searchText.length > 40 ? `${searchText.slice(0, 40)}…` : searchText;
        const embed = new EmbedBuilder()
            .setColor(color)
            .setTitle(`🔍 Who said "${shortQuery}"?`)
            .setDescription(lines.join("\n"))
            .setFooter({
                text: `Said ${totalTimes} time${totalTimes === 1 ? "" : "s"} by ${countRows.length === 1 ? "1 person" : `${countRows.length} people`}`,  
            });

        context.messageHandler.send(message, embed);
    } catch (err) {
        context.logger.error(toError(err));
    }
}
