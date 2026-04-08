import { EmbedBuilder } from "../../interfaces/discord";
import type { ICommand } from "../../interfaces";
import { Lister } from "./lister";
import type { GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";
import { countVowelGroups } from "../../systems/stringHelpers";

class SyllableLister extends Lister {
    override async mention(
        message: GuildBotMessage,
        mentioned: {
            id: string;
        },
        context: IBotContext,
    ): Promise<void> {
        const selectSQL = `SELECT user_id, message FROM messages WHERE server_id = $1 AND user_id = $2`;
        const userdata = { syllables: 0, total: 0, average: 0 };
        const rows = await context.database.query<{
            user_id: string;
            message: string;
        }>(selectSQL, [message.guild.id, mentioned.id]);
        for (let i = 0; i < rows.length; i++) {
            const syllables = this.calculateSyllables(rows[i].message);
            if (syllables >= 1) {
                userdata.syllables += syllables;
                userdata.total += 1;
            }
        }

        userdata.average = Math.round(userdata.syllables / userdata.total);
        const userName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        context.messageHandler.send(
            message,
            `\`${userName}\` has an average of ${userdata.average} syllables per post`,
        );
    }

    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT user_id, message FROM messages WHERE server_id = $1`;
        const userdata: Record<
            string,
            {
                syllables: number;
                total: number;
                average: number;
            }
        > = {};
        const rows = await context.database.query<{
            user_id: string;
            message: string;
        }>(selectSQL, [message.guild.id]);
        for (let i = 0; i < rows.length; i++) {
            const userId = rows[i].user_id;
            if (!userdata[userId]) userdata[userId] = { syllables: 0, total: 0, average: 0 };
            const syllables = this.calculateSyllables(rows[i].message);
            if (syllables >= 1) {
                userdata[userId].syllables += syllables;
                userdata[userId].total += 1;
            }
        }

        const sorted: [string, number][] = [];
        for (const userId in userdata) {
            userdata[userId].average = Math.round(userdata[userId].syllables / userdata[userId].total);
            sorted.push([userId, userdata[userId].average]);
        }

        sorted.sort((a, b) => b[1] - a[1]);
        const userNames: Record<string, string> = {};
        for (const [userId] of sorted)
            userNames[userId] = await context.userHandler.getDisplayName(userId, message.guild.id);
        const pages = await context.pagination.createPages(
            sorted,
            10,
            (pageRows: [string, number][], pageNum: number, totalPages: number) => {
                let result = "";
                for (const row of pageRows)
                    result += `\`${userNames[row[0]]}\` has an average of ${row[1]} syllables per post \n`;

                return new EmbedBuilder()
                    .setColor(context.config.color_hex)
                    .setTitle(`Top most intellectual posters in ${message.guild?.name}`)
                    .setDescription(result)
                    .setFooter({ text: `Page ${pageNum}/${totalPages}` });
            },
        );
        context.pagination.sendPaginatedEmbed(message, pages);
    }

    calculateSyllables(message: string): number {
        const normalized = message.replace(/e /i, "").replace(/ y/i, "");

        return countVowelGroups(normalized);
    }
}

export default {
    name: "syllables",
    description: "shows the top users with the most syllables in their posts",
    format: "syllables (@user)",
    subcommands: [
        { name: "top", description: "Show top users by syllable count" },
        {
            name: "user",
            description: "Show syllable stats for a specific user",
            options: [{ type: "user", name: "user", description: "The user to check", required: true }],
        },
    ],
    function(message, context) {
        new SyllableLister().process(message, context);
    },
} satisfies ICommand;
