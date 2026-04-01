import * as discord from "discord.js";
import type { ICommand } from "../../interfaces";
import { Lister } from "./lister";
import type { GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";
import letterValues from "../../json/letter_values.json";
class ScoreLister extends Lister {
    override async mention(
        message: GuildBotMessage,
        mentioned: {
            id: string;
        },
        context: IBotContext,
    ): Promise<void> {
        const selectSQL = `SELECT user_id, message FROM messages WHERE server_id = $1 AND user_id = $2`;
        const userdata = { points: 0, total: 0, quality: 0, score: 0 };
        const rows = await context.database.query<{
            user_id: string;
            message: string;
        }>(selectSQL, [message.guild.id, mentioned.id]);
        for (let i = 0; i < rows.length; i++) {
            userdata.points += this.calculateScore(rows[i]["message"]);
            userdata.total += rows[i]["message"].length;
        }
        userdata.quality = userdata.points / userdata.total / 2;
        userdata.score = Math.round(userdata.total * userdata.quality);
        const userName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        context.messageHandler.send(message, `\`${userName}\`'s post score is ${userdata.score}`);
    }
    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const selectSQL = `SELECT user_id, message FROM messages WHERE server_id = $1`;
        const userdata: Record<
            string,
            {
                points: number;
                total: number;
                quality: number;
                score: number;
            }
        > = {};
        const rows = await context.database.query<{
            user_id: string;
            message: string;
        }>(selectSQL, [message.guild.id]);
        for (let i = 0; i < rows.length; i++) {
            const userId = rows[i]["user_id"];
            if (!userdata[userId]) userdata[userId] = { points: 0, total: 0, quality: 0, score: 0 };
            userdata[userId].points += this.calculateScore(rows[i]["message"]);
            userdata[userId].total += rows[i]["message"].length;
        }
        const sorted: [string, number][] = [];
        for (const userId in userdata) {
            userdata[userId].quality = userdata[userId].points / userdata[userId].total / 2;
            userdata[userId].score = Math.round(userdata[userId].total * userdata[userId].quality);
            sorted.push([userId, userdata[userId].score]);
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
                for (const row of pageRows) result += `\`${userNames[row[0]]}\`'s post score is ${row[1]} \n`;
                return new discord.EmbedBuilder()
                    .setColor(context.config.color_hex)
                    .setTitle(`Top posters by score in ${message.guild?.name}`)
                    .setDescription(result)
                    .setFooter({ text: `Page ${pageNum}/${totalPages}` });
            },
        );
        context.pagination.sendPaginatedEmbed(message, pages);
    }
    calculateScore(message: string): number {
        let score = 0;
        for (let i = 0; i < message.length; i++) {
            const val = (letterValues as Record<string, number>)[message.charAt(i)];
            score += val === undefined ? 0 : val;
        }
        return score;
    }
}
export default {
    name: "score",
    description: "shows the top scoring posters in the server",
    format: "score (@user)",
    subcommands: [
        { name: "top", description: "Show top scoring posters" },
        {
            name: "user",
            description: "Show score for a specific user",
            options: [{ type: "user", name: "user", description: "The user to check", required: true }],
        },
    ],
    function(message, context) {
        new ScoreLister().process(message, context);
    },
} satisfies ICommand;
