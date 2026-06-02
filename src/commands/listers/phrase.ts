import type { ICommand, IBotContext } from "../../interfaces";
import { Lister } from "./lister";
import { isGuildMessage } from "../../interfaces/discord";
import type { BotMessage, GuildBotMessage } from "../../interfaces/discord";
import { removeQuotes } from "../../systems/stringHelpers";
import { toError } from "../../systems/utils";

const phraseHelperMessage = `Please specify a word or phrase to search for!

**Usage:**
• \`phrase hello\` - count total uses in server
• \`phrase "hello world"\` - search multi-word phrases (use quotes)
• \`phrase @user hello\` - count uses by specific user
• \`phrase top hello\` - leaderboard of who says it most
• \`phrase percent hello\` - percentage of each user's messages containing it`;

class PhraseLister extends Lister {
    override async process(message: BotMessage, context: IBotContext): Promise<void> {
        if (!isGuildMessage(message)) {
            await context.messageHandler.reply(message, "This command only works in a server.");

            return;
        }

        const { mention, leaderboard, percent, args } = this.parseArgs(message, { preserveQuotes: true });
        const word = args[0] ? removeQuotes(args[0]).toLowerCase() : undefined;
        if (!word) {
            await context.messageHandler.send(message, phraseHelperMessage);

            return;
        }
        try {
            if (mention) await this.phraseWithMention(message, mention, word, context);
            else if (leaderboard) await this.phraseLeaderboard(message, word, context);
            else if (percent) await this.phrasePercentage(message, word, context);
            else await this.phraseTotal(message, word, context);
        } catch (err) {
            context.logger.error(toError(err));
        }
    }

    private async phraseLeaderboard(message: GuildBotMessage, word: string, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT user_id, server_id, count(message) as count
            FROM messages
            WHERE message ILIKE $1 AND server_id = $2
            GROUP BY user_id, server_id
            HAVING count(message) > 1
            ORDER BY count(message) DESC`;
        const rows = await context.database.query<{ user_id: string; server_id: string; count: string }>(selectSQL, [
            `%${word}%`,
            message.guild.id,
        ]);
        if (!rows || rows.length === 0) {
            await context.messageHandler.send(message, `Nothing found for ${word} in ${message.guild?.name}`);

            return;
        }

        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) {
                const userName = await context.userHandler.getDisplayName(row.user_id, row.server_id);
                result += `\`${userName}\` has said ${word} ${row.count} times! \n`;
            }

            return this.buildPageEmbed(
                context.config.color_hex,
                `Top users for "${word}" in ${message.guild?.name}`,
                result,
                pageNum,
                totalPages,
            );
        });
        await context.pagination.sendPaginatedEmbed(message, pages);
    }

    private async phraseTotal(message: GuildBotMessage, word: string, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT COUNT(*) as count FROM messages WHERE message ILIKE $1 AND server_id = $2`;
        const rows = await context.database.query<{ count: string }>(selectSQL, [`%${word}%`, message.guild.id]);
        await context.messageHandler.send(
            message,
            `Ive found ${rows[0].count} messages in this server that contain ${word}`,
        );
    }

    private async phraseWithMention(
        message: GuildBotMessage,
        mentioned: { id: string },
        word: string,
        context: IBotContext,
    ): Promise<void> {
        const selectSQL = `SELECT COUNT(*) as count FROM messages WHERE message ILIKE $1 AND server_id = $2 AND user_id = $3`;
        const rows = await context.database.query<{ count: string }>(selectSQL, [
            `%${word}%`,
            message.guild.id,
            mentioned.id,
        ]);
        const userName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        await context.messageHandler.send(
            message,
            `Ive found ${rows[0].count} messages from \`${userName}\` in this server that contain ${word}`,
        );
    }

    private async phrasePercentage(message: GuildBotMessage, word: string, context: IBotContext): Promise<void> {
        const selectSQL = `WITH filtered AS (
                SELECT user_id, server_id, COUNT(*) AS count
                FROM messages
                WHERE message ILIKE $1 AND server_id = $2
                GROUP BY user_id, server_id
                HAVING COUNT(*) > 1
            ), totals AS (
                SELECT user_id, server_id, COUNT(*) AS total
                FROM messages
                WHERE server_id = $2
                GROUP BY user_id, server_id
            )
            SELECT filtered.user_id, filtered.server_id, filtered.count, totals.total
            FROM filtered
            JOIN totals ON filtered.user_id = totals.user_id AND filtered.server_id = totals.server_id
            ORDER BY filtered.count DESC`;
        const rows = await context.database.query<{
            user_id: string;
            server_id: string;
            count: string;
            total: string;
        }>(selectSQL, [`%${word}%`, message.guild.id]);
        if (!rows || rows.length === 0) {
            await context.messageHandler.send(message, `Nothing found for ${word} in ${message.guild?.name}`);

            return;
        }

        const sortedRows = (
            await Promise.all(
                rows.map(async (row) => ({
                    userName: await context.userHandler.getDisplayName(row.user_id, row.server_id),
                    percentage: ((parseInt(row.count) / parseInt(row.total)) * 100).toFixed(3),
                })),
            )
        ).sort((a, b) => parseFloat(b.percentage) - parseFloat(a.percentage));
        const pages = await context.pagination.createPages(sortedRows, 10, (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows)
                result += `\`${row.userName}\` has said ${word} in ${row.percentage}% of their messages! \n`;

            return this.buildPageEmbed(
                context.config.color_hex,
                `Top users by percentage for "${word}" in ${message.guild?.name}`,
                result,
                pageNum,
                totalPages,
            );
        });
        await context.pagination.sendPaginatedEmbed(message, pages);
    }
}

export default {
    name: "phrase",
    description: "shows how many times a word/phrase has been used in the server",
    format: "phrase [word] | phrase (@user) [word] | phrase top [word] | phrase percent [word]",
    aliases: "word",
    subcommands: [
        {
            name: "total",
            description: "Show total usage of a phrase",
            options: [
                { type: "string", name: "phrase", description: "The word or phrase to search for", required: true },
            ],
        },
        {
            name: "top",
            description: "Show who uses a phrase the most",
            options: [
                { type: "string", name: "phrase", description: "The word or phrase to search for", required: true },
            ],
        },
        {
            name: "percent",
            description: "Show percentage breakdown of phrase usage",
            options: [
                { type: "string", name: "phrase", description: "The word or phrase to search for", required: true },
            ],
        },
        {
            name: "user",
            description: "Show phrase usage for a specific user",
            options: [
                { type: "user", name: "user", description: "The user to check", required: true },
                { type: "string", name: "phrase", description: "The word or phrase to search for", required: true },
            ],
        },
    ],
    function(message, context) {
        return new PhraseLister().process(message, context);
    },
} satisfies ICommand;
