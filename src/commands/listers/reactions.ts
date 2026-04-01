import * as discord from "discord.js";
import type { ICommand } from "../../interfaces";
import { Lister } from "./lister";
import type { GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";

class ReactionsLister extends Lister {
    override async total(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT r.emoji as emoji, COUNT(*) as count
            FROM reactions r
            JOIN messages m ON r.message_id = m.id
            WHERE m.server_id = $1
            GROUP BY r.emoji
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`;
        const rows = await context.database.query(selectSQL, [message.guild.id]);
        if (!rows || rows.length === 0)
            return void context.messageHandler.send(message, `No reactions found in ${message.guild?.name}`);
        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) result += `${row["emoji"]} was used ${row["count"]} times! \n`;

            return new discord.EmbedBuilder()
                .setColor(context.config.color_hex)
                .setTitle(`Top reactions in ${message.guild?.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` });
        });
        context.pagination.sendPaginatedEmbed(message, pages);
    }

    override async mention(
        message: GuildBotMessage,
        mentioned: {
            id: string;
        },
        context: IBotContext,
    ): Promise<void> {
        const selectSQL = `SELECT r.emoji as emoji, COUNT(*) as count
            FROM reactions r
            JOIN messages m ON r.message_id = m.id
            WHERE m.server_id = $1 AND r.user_id = $2
            GROUP BY r.emoji
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`;
        const rows = await context.database.query(selectSQL, [message.guild.id, mentioned.id]);
        const userName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        if (!rows || rows.length === 0)
            return void context.messageHandler.send(message, `No reactions found for ${userName}`);
        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) result += `${row["emoji"]} was used ${row["count"]} times! \n`;

            return new discord.EmbedBuilder()
                .setColor(context.config.color_hex)
                .setTitle(`Reactions used by ${userName} in ${message.guild?.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` });
        });
        context.pagination.sendPaginatedEmbed(message, pages);
    }

    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT r.user_id, m.server_id, COUNT(*) as count
            FROM reactions r
            JOIN messages m ON r.message_id = m.id
            WHERE m.server_id = $1
            GROUP BY r.user_id, m.server_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`;
        const rows = await context.database.query(selectSQL, [message.guild.id]);
        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) {
                const userName = await context.userHandler.getDisplayName(row["user_id"], row["server_id"]);
                result += `\`${userName}\` has reacted ${row["count"]} times! \n`;
            }

            return new discord.EmbedBuilder()
                .setColor(context.config.color_hex)
                .setTitle(`Top reactors in ${message.guild?.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` });
        });
        context.pagination.sendPaginatedEmbed(message, pages);
    }

    override percentage(message: GuildBotMessage, context: IBotContext): void {
        context.messageHandler.reply(message, "This command does not work with %");
    }
}

export default {
    name: "reactions",
    description: "shows top reactions in server",
    format: "reactions | reactions @user | reactions top",
    subcommands: [
        { name: "total", description: "Show total usage of reactions" },
        { name: "top", description: "Show top 10 most used reactions" },
        {
            name: "user",
            description: "Show top reactions by a specific user",
            options: [{ type: "user", name: "user", description: "The user to check", required: true }],
        },
    ],
    function(message, context) {
        new ReactionsLister().process(message, context);
    },
} satisfies ICommand;
