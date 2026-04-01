import * as discord from "discord.js";
import type { ICommand } from "../../interfaces";
import { Lister } from "./lister";
import type { GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";

class CountLister extends Lister {
    override async total(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = "SELECT COUNT(*) as count FROM messages WHERE server_id = $1";
        const rows = await context.database.query(selectSQL, [message.guild.id]);
        context.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages in ${message.guild?.name}`);
    }

    override async mention(
        message: GuildBotMessage,
        mentioned: {
            id: string;
        },
        context: IBotContext,
    ): Promise<void> {
        const selectSQL = "SELECT COUNT(*) as count FROM messages WHERE server_id = $1 AND user_id = $2";
        const rows = await context.database.query(selectSQL, [message.guild.id, mentioned.id]);
        const userName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        context.messageHandler.send(
            message,
            `Ive found ${rows[0]["count"]} messages by \`${userName}\` in this server`,
        );
    }

    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT user_id, server_id, COUNT(*) as count
            FROM messages
            WHERE server_id = $1
            GROUP BY user_id, server_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`;
        const rows = await context.database.query(selectSQL, [message.guild.id]);
        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) {
                const userName = await context.userHandler.getDisplayName(row["user_id"], row["server_id"]);
                result += `\`${userName}\` has posted ${row["count"]} messages! \n`;
            }

            return new discord.EmbedBuilder()
                .setColor(context.config.color_hex)
                .setTitle(`Top 10 posters in ${message.guild?.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` });
        });
        context.pagination.sendPaginatedEmbed(message, pages);
    }

    override async percentage(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `WITH totals AS (
                SELECT server_id, COUNT(*) AS total
                FROM messages
                WHERE server_id = $1
                GROUP BY server_id
            )
            SELECT m.user_id, m.server_id, COUNT(*) as count, t.total
            FROM messages m
            JOIN totals t ON m.server_id = t.server_id
            WHERE m.server_id = $1
            GROUP BY m.user_id, m.server_id, t.total
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`;
        const rows = await context.database.query(selectSQL, [message.guild.id]);
        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) {
                const userName = await context.userHandler.getDisplayName(row["user_id"], row["server_id"]);
                result += `\`${userName}\` has posted ${Math.round((parseInt(row["count"]) / parseInt(row["total"])) * 100)}% of all messages! \n`;
            }

            return new discord.EmbedBuilder()
                .setColor(context.config.color_hex)
                .setTitle(`Top 10 posters in ${message.guild?.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` });
        });
        context.pagination.sendPaginatedEmbed(message, pages);
    }
}

export default {
    name: "count",
    description: "counts messages in the server",
    format: "count | count @user | count top | count percent",
    subcommands: [
        { name: "total", description: "Show total message count" },
        { name: "top", description: "Show top message posters" },
        { name: "percent", description: "Show percentage breakdown by user" },
        {
            name: "user",
            description: "Show message count for a specific user",
            options: [{ type: "user", name: "user", description: "The user to check", required: true }],
        },
    ],
    function(message, context) {
        new CountLister().process(message, context);
    },
} satisfies ICommand;
