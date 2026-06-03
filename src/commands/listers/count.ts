import type { ICommand } from "../../interfaces";
import { Lister } from "./lister";
import type { GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";

class CountLister extends Lister {
    override async total(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = "SELECT COUNT(*) as count FROM messages WHERE server_id = $1";
        const rows = await context.database.query<{ count: string }>(selectSQL, [message.guild.id]);
        await context.messageHandler.send(message, `Ive found ${rows[0].count} messages in ${message.guild?.name}`);
    }

    override async mention(
        message: GuildBotMessage,
        mentioned: {
            id: string;
        },
        context: IBotContext,
    ): Promise<void> {
        const selectSQL = "SELECT COUNT(*) as count FROM messages WHERE server_id = $1 AND user_id = $2";
        const rows = await context.database.query<{ count: string }>(selectSQL, [message.guild.id, mentioned.id]);
        const userName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        await context.messageHandler.send(
            message,
            `Ive found ${rows[0].count} messages by \`${userName}\` in this server`,
        );
    }

    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT user_id, server_id, COUNT(*) as count
            FROM messages
            WHERE server_id = $1
            GROUP BY user_id, server_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`;
        const rows = await context.database.query<{ user_id: string; server_id: string; count: string }>(selectSQL, [
            message.guild.id,
        ]);
        await this.sendUserCountLeaderboard(message, context, rows, "messages");
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
        const rows = await context.database.query<{ user_id: string; server_id: string; count: string; total: string }>(
            selectSQL,
            [message.guild.id],
        );
        await this.sendUserLeaderboard(
            message,
            context,
            rows,
            (userName, row) =>
                `\`${userName}\` has posted ${Math.round((parseInt(row.count) / parseInt(row.total)) * 100)}% of all messages! \n`,
        );
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
        return new CountLister().process(message, context);
    },
} satisfies ICommand;
