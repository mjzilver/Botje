import type { ICommand } from "../../interfaces";
import { EmbedBuilder } from "../../interfaces/discord";
import { Lister } from "./lister";
import type { GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";

class SaidLister extends Lister {
    override async total(message: GuildBotMessage, context: IBotContext): Promise<void> {
        return this.perPerson(message, context);
    }

    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `WITH normalized AS (
                SELECT LOWER(message) AS message
                FROM messages
                WHERE message NOT LIKE '%<%' AND server_id = $1
            )
            SELECT message, COUNT(*) as count
            FROM normalized
            GROUP BY message
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 100`;
        const rows = await context.database.query<{ message: string; count: string }>(selectSQL, [message.guild.id]);
        if (!rows || rows.length === 0) {
            await context.messageHandler.send(message, `No repeated phrases found in ${message.guild?.name}`);

            return;
        }

        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) result += `${row.message} was said ${row.count} times \n`;

            return this.buildPageEmbed(
                context.config.color_hex,
                `Top most used phrases in ${message.guild?.name}`,
                result,
                pageNum,
                totalPages,
            );
        });
        await context.pagination.sendPaginatedEmbed(message, pages);
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
                WHERE message NOT LIKE '%<%' AND message NOT LIKE '%:%'
                AND server_id = $1 AND user_id = $2
            )
            SELECT message, COUNT(*) as count
            FROM normalized
            GROUP BY message
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 10`;
        const rows = await context.database.query<{ message: string; count: string }>(selectSQL, [
            message.guild.id,
            mentioned.id,
        ]);
        let result = "";
        for (let i = 0; i < rows.length && i <= 10; i++)
            result += `${rows[i].message} was said ${rows[i].count} times \n`;
        const userName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        const top = new EmbedBuilder()
            .setColor(context.config.color_hex)
            .setTitle(`Top 10 most used phrases in ${message.guild?.name} by \`${userName}\``)
            .setDescription(result);
        await context.messageHandler.send(message, { embeds: [top] });
    }
}

export default {
    name: "said",
    description: "shows the most repeated phrases in the server",
    format: "said | said @user",
    subcommands: [
        { name: "total", description: "Show most repeated phrases in server" },
        {
            name: "user",
            description: "Show most repeated phrases for a specific user",
            options: [{ type: "user", name: "user", description: "The user to check", required: true }],
        },
    ],
    function(message, context) {
        return new SaidLister().process(message, context);
    },
} satisfies ICommand;
