import type { ICommand } from "../../interfaces";
import { Lister } from "./lister";
import type { GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";

class EmotesLister extends Lister {
    override async total(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `WITH normalized AS (
                SELECT LOWER(message) AS message
                FROM messages
                WHERE (message LIKE '%<%') AND message NOT LIKE '%@%'
                AND server_id = $1
            )
            SELECT message, COUNT(*) as count
            FROM normalized
            GROUP BY message
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 100`;
        const rows = await context.database.query<{ message: string; count: string }>(selectSQL, [message.guild.id]);
        await this.sendPaginatedRows(
            message,
            context,
            rows,
            `Top emotes in ${message.guild?.name}`,
            (row) => `${row.message} was used ${row.count} times! \n`,
            `No emotes found in ${message.guild?.name}`,
        );
    }

    override async mention(
        message: GuildBotMessage,
        mentioned: {
            id: string;
        },
        context: IBotContext,
    ): Promise<void> {
        const selectSQL = `WITH normalized AS (
                SELECT LOWER(message) AS message
                FROM messages
                WHERE (message LIKE '%<%') AND message NOT LIKE '%@%'
                AND server_id = $1 AND user_id = $2
            )
            SELECT message, COUNT(*) as count
            FROM normalized
            GROUP BY message
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 1000`;
        const rows = await context.database.query<{ message: string; count: string }>(selectSQL, [
            message.guild.id,
            mentioned.id,
        ]);
        const userName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        await this.sendPaginatedRows(
            message,
            context,
            rows,
            `Emotes used by ${userName} in ${message.guild?.name}`,
            (row) => `${row.message} said ${row.count} times! \n`,
            `No emotes found for ${userName}`,
        );
    }

    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT user_id, server_id, COUNT(*) as count
            FROM messages
            WHERE (message LIKE '%<%') AND message NOT LIKE '%@%'
            AND server_id = $1
            GROUP BY user_id, server_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`;
        const rows = await context.database.query<{ user_id: string; server_id: string; count: string }>(selectSQL, [
            message.guild.id,
        ]);
        await this.sendUserCountLeaderboard(message, context, rows, "emotes");
    }

    override async percentage(message: GuildBotMessage, context: IBotContext): Promise<void> {
        await context.messageHandler.reply(message, "This command does not work with %");
    }
}

export default {
    name: "emotes",
    description: "shows top emotes in server",
    format: "emotes | emotes @user | emotes top",
    subcommands: [
        { name: "top", description: "Show top 10 most used emotes" },
        { name: "percent", description: "Show emote usage by person" },
        {
            name: "user",
            description: "Show top emotes for a specific user",
            options: [{ type: "user", name: "user", description: "The user to check", required: true }],
        },
    ],
    function(message, context) {
        return new EmotesLister().process(message, context);
    },
} satisfies ICommand;
