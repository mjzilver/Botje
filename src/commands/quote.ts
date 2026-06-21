import type { ICommand } from "../interfaces";
import { EmbedBuilder } from "../interfaces/discord";
import { toError } from "../utils";
import { colorHex, formatDate } from "../utils/helpers/stringHelpers";
import { isGuildMessage } from "../interfaces/discord";

type QuoteRow = { id: string; user_id: string; message: string; datetime: string };

export default {
    name: "quote",
    description: "fetches a random archived message from server history",
    format: "quote | quote (@user) | quote (keyword)",
    options: [
        { type: "user", name: "user", description: "Quote a specific user (optional)", required: false },
        { type: "string", name: "keyword", description: "Search for a keyword (optional)", required: false },
    ],
    async function(message, context) {
        if (!isGuildMessage(message)) {
            context.messageHandler.reply(message, "This command can only be used in a server.");

            return;
        }

        const mention = message.mentions.users.first();
        const args = message.content.split(/\s+/).slice(1);
        const keyword = !mention && args.length > 0 ? args.join(" ") : null;

        let sql: string;
        let params: (string | number)[];

        if (mention) {
            sql = `SELECT id, user_id, message, datetime FROM messages
                   WHERE server_id = $1 AND user_id = $2
                   AND LENGTH(message) > 10
                   AND regexp_replace(message, '<[^>]+>|https?://\\S+|www\\.\\S+', '', 'g') ~ '\\w{4,}'
                   ORDER BY RANDOM() LIMIT 1`;
            params = [message.guild.id, mention.id];
        } else if (keyword) {
            sql = `SELECT id, user_id, message, datetime FROM messages
                   WHERE server_id = $1
                   AND message ILIKE $2
                   AND LENGTH(message) > 10
                   AND regexp_replace(message, '<[^>]+>|https?://\\S+|www\\.\\S+', '', 'g') ~ '\\w{4,}'
                   ORDER BY RANDOM() LIMIT 1`;
            params = [message.guild.id, `%${keyword}%`];
        } else {
            sql = `SELECT id, user_id, message, datetime FROM messages
                   WHERE server_id = $1
                   AND LENGTH(message) > 10
                   AND regexp_replace(message, '<[^>]+>|https?://\\S+|www\\.\\S+', '', 'g') ~ '\\w{4,}'
                   ORDER BY RANDOM() LIMIT 1`;
            params = [message.guild.id];
        }

        try {
            const rows = await context.database.query<QuoteRow>(sql, params);
            if (rows.length === 0) {
                context.messageHandler.reply(
                    message,
                    keyword ? `No messages found matching "${keyword}".` : "No messages found.",
                );

                return;
            }

            const row = rows[0];
            const authorName = await context.userHandler.getDisplayName(row.user_id, message.guild.id);
            const embed = new EmbedBuilder()
                .setColor(colorHex(context.config.color_hex))
                .setDescription(`"${row.message}"`)
                .setFooter({ text: `— ${authorName} · ${formatDate(parseInt(row.datetime, 10))}` });

            context.messageHandler.send(message, embed);
        } catch (err) {
            context.logger.error(toError(err));
            context.messageHandler.reply(message, "Couldn't find a quote.");
        }
    },
} satisfies ICommand;
