import { EmbedBuilder } from "../../interfaces/discord";
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
        const rows = await context.database.query(selectSQL, [message.guild.id]);
        if (!rows || rows.length === 0)
            return void context.messageHandler.send(message, `No reply relationships found in ${message.guild?.name}`);
        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) {
                const fromName = await context.userHandler.getDisplayName(row["from_user"], message.guild.id);
                const toName = await context.userHandler.getDisplayName(row["to_user"], message.guild.id);
                result += `\`${fromName}\` sent ${row["count"]} replies to \`${toName}\`\n`;
            }

            return new EmbedBuilder()
                .setColor(context.config.color_hex)
                .setTitle(`Top reply relationships in ${message.guild?.name}`)
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
        const selectSQL = `SELECT t.user_id as to_user, COUNT(*) as count
            FROM messages m
            JOIN messages t ON m.reply_to = t.id
            WHERE m.server_id = $1 AND m.user_id = $2
            GROUP BY t.user_id
            HAVING COUNT(*) > 0
            ORDER BY COUNT(*) DESC
            LIMIT 10`;
        const rows = await context.database.query(selectSQL, [message.guild.id, mentioned.id]);
        const fromName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        if (!rows || rows.length === 0)
            return void context.messageHandler.send(message, `No replies found for ${fromName}`);
        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) {
                const toName = await context.userHandler.getDisplayName(row["to_user"], message.guild.id);
                result += `\`${fromName}\` sent ${row["count"]} replies to \`${toName}\`\n`;
            }

            return new EmbedBuilder()
                .setColor(context.config.color_hex)
                .setTitle(`Who ${fromName} replies to most in ${message.guild?.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` });
        });
        context.pagination.sendPaginatedEmbed(message, pages);
    }

    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT user_id, server_id, COUNT(*) as count
            FROM messages
            WHERE server_id = $1 AND reply_to IS NOT NULL
            GROUP BY user_id, server_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`;
        const rows = await context.database.query(selectSQL, [message.guild.id]);
        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) {
                const userName = await context.userHandler.getDisplayName(row["user_id"], row["server_id"]);
                result += `\`${userName}\` has sent ${row["count"]} replies! \n`;
            }

            return new EmbedBuilder()
                .setColor(context.config.color_hex)
                .setTitle(`Top repliers in ${message.guild?.name}`)
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
        new RepliesLister().process(message, context);
    },
} satisfies ICommand;
