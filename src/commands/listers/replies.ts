import type { ICommand } from "../../interfaces";
import { Lister } from "./lister";
import type { GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";

class RepliesLister extends Lister {
    override async total(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT m.user_id as from_user, t.user_id as to_user, COUNT(*) as count
            FROM messages m
            JOIN messages t ON m.reply_to = t.id
            WHERE m.server_id = $1
            GROUP BY m.user_id, t.user_id
            HAVING COUNT(*) > 0
            ORDER BY COUNT(*) DESC`;
        const rows = await context.database.query<{ from_user: string; to_user: string; count: string }>(selectSQL, [
            message.guild.id,
        ]);
        if (!rows || rows.length === 0) {
            await context.messageHandler.send(message, `No reply relationships found in ${message.guild?.name}`);

            return;
        }

        await this.sendPaginatedRows(
            message,
            context,
            rows,
            `Top reply relationships in ${message.guild?.name}`,
            async (row) => {
                const fromName = await context.userHandler.getDisplayName(row.from_user, message.guild.id);
                const toName = await context.userHandler.getDisplayName(row.to_user, message.guild.id);

                return `\`${fromName}\` sent ${row.count} replies to \`${toName}\`\n`;
            },
        );
    }

    override async mention(
        message: GuildBotMessage,
        mentioned: {
            id: string;
        },
        context: IBotContext,
    ): Promise<void> {
        const selectSQL = `SELECT t.user_id as to_user, COUNT(*) as count
            FROM messages m
            JOIN messages t ON m.reply_to = t.id
            WHERE m.server_id = $1 AND m.user_id = $2
            GROUP BY t.user_id
            HAVING COUNT(*) > 0
            ORDER BY COUNT(*) DESC
            LIMIT 10`;
        const rows = await context.database.query<{ to_user: string; count: string }>(selectSQL, [
            message.guild.id,
            mentioned.id,
        ]);
        const fromName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        await this.sendPaginatedRows(
            message,
            context,
            rows,
            `Who ${fromName} replies to most in ${message.guild?.name}`,
            async (row) => {
                const toName = await context.userHandler.getDisplayName(row.to_user, message.guild.id);

                return `\`${fromName}\` sent ${row.count} replies to \`${toName}\`\n`;
            },
            `No replies found for ${fromName}`,
        );
    }

    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT user_id, server_id, COUNT(*) as count
            FROM messages
            WHERE server_id = $1 AND reply_to IS NOT NULL
            GROUP BY user_id, server_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`;
        const rows = await context.database.query<{ user_id: string; server_id: string; count: string }>(selectSQL, [
            message.guild.id,
        ]);
        await this.sendPaginatedRows(message, context, rows, `Top repliers in ${message.guild?.name}`, async (row) => {
            const userName = await context.userHandler.getDisplayName(row.user_id, row.server_id);

            return `\`${userName}\` has sent ${row.count} replies! \n`;
        });
    }

    override async percentage(message: GuildBotMessage, context: IBotContext): Promise<void> {
        await context.messageHandler.reply(message, "This command does not work with %");
    }
}

export default {
    name: "replies",
    description: "shows reply relationships (who replies to whom and how often)",
    format: "replies | replies @user | replies top",
    subcommands: [
        { name: "total", description: "Show top reply relationships" },
        { name: "top", description: "Show top reply relationships" },
        {
            name: "user",
            description: "Show top people a user replies to",
            options: [{ type: "user", name: "user", description: "The user to check", required: true }],
        },
    ],
    function(message, context) {
        return new RepliesLister().process(message, context);
    },
} satisfies ICommand;
