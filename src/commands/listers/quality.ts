import { EmbedBuilder } from "../../interfaces/discord";
import type { ICommand } from "../../interfaces";
import { Lister } from "./lister";
import type { GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";

class QualityLister extends Lister {
    override async mention(
        message: GuildBotMessage,
        mentioned: {
            id: string;
        },
        context: IBotContext,
    ): Promise<void> {
        const selectSQL = `SELECT user_id,
                COUNT(*) AS total_messages,
                COUNT(DISTINCT message) AS unique_messages,
                (COUNT(DISTINCT message) * 100.0 / COUNT(*)) AS percentage_unique
            FROM messages m
            WHERE server_id = $1 AND user_id = $2
            GROUP BY user_id
            HAVING COUNT(*) > 1000
            ORDER BY percentage_unique DESC, user_id`;
        const rows = await context.database.query<{
            user_id: string;
            percentage_unique: string;
        }>(selectSQL, [message.guild.id, mentioned.id]);
        const userName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        if (rows.length === 0)
            return void context.messageHandler.send(
                message,
                `\`${userName}\` does not have enough qualifying messages.`,
            );
        const userQuality = parseFloat(rows[0].percentage_unique).toFixed(2);
        context.messageHandler.send(message, `\`${userName}\`'s post quality is ${userQuality}%`);
    }

    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT user_id,
            COUNT(*) AS total_messages,
            COUNT(DISTINCT message) AS unique_messages,
            (COUNT(DISTINCT message) * 100.0 / COUNT(*)) AS percentage_unique
        FROM messages m
        WHERE server_id = $1
        GROUP BY user_id
        HAVING COUNT(*) > 1000
        ORDER BY percentage_unique DESC, user_id`;
        const rows = await context.database.query<{ user_id: string; percentage_unique: string }>(selectSQL, [
            message.guild.id,
        ]);
        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) {
                const userName = await context.userHandler.getDisplayName(row.user_id, message.guild.id);
                result += `\`${userName}\`'s post quality is ${parseFloat(row.percentage_unique).toFixed(2)}% \n`;
            }

            return new EmbedBuilder()
                .setColor(context.config.color_hex)
                .setTitle(`Top 10 quality posters in ${message.guild?.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` });
        });
        context.pagination.sendPaginatedEmbed(message, pages);
    }
}

export default {
    name: "quality",
    description: "shows post quality (uniqueness)",
    format: "quality @user | quality top",
    subcommands: [
        { name: "top", description: "Show users with highest quality posts" },
        {
            name: "user",
            description: "Show quality for a specific user",
            options: [{ type: "user", name: "user", description: "The user to check", required: true }],
        },
    ],
    function(message, context) {
        new QualityLister().process(message, context);
    },
} satisfies ICommand;
