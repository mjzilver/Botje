import type { ICommand } from "../../interfaces";
import { Lister } from "./lister";
import type { GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";
import { queryCache, CacheKey } from "../../systems/queryCache";

type ScoreRow = { user_id: string; total_chars: string };

class ScoreLister extends Lister {
    override async mention(
        message: GuildBotMessage,
        mentioned: {
            id: string;
        },
        context: IBotContext,
    ): Promise<void> {
        const rows = await queryCache(CacheKey.scoreUser(message.guild.id, mentioned.id), () =>
            context.database.query<ScoreRow>(
                `SELECT user_id, SUM(LENGTH(message)) AS total_chars
                 FROM messages WHERE server_id = $1 AND user_id = $2
                 GROUP BY user_id`,
                [message.guild.id, mentioned.id],
            ),
        );
        const userName = await context.userHandler.getDisplayName(mentioned.id, message.guild.id);
        const score = rows.length > 0 ? parseInt(rows[0].total_chars, 10) : 0;
        context.messageHandler.send(message, `\`${userName}\`'s post score is ${score}`);
    }

    override async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        const rows = await queryCache(CacheKey.scoreServer(message.guild.id), () =>
            context.database.query<ScoreRow>(
                `SELECT user_id, SUM(LENGTH(message)) AS total_chars
                 FROM messages WHERE server_id = $1
                 GROUP BY user_id
                 ORDER BY total_chars DESC`,
                [message.guild.id],
            ),
        );
        const userNames: Record<string, string> = {};
        for (const row of rows)
            userNames[row.user_id] = await context.userHandler.getDisplayName(row.user_id, message.guild.id);
        const pages = await context.pagination.createPages(
            rows,
            10,
            (pageRows: ScoreRow[], pageNum: number, totalPages: number) => {
                let result = "";
                for (const row of pageRows)
                    result += `\`${userNames[row.user_id]}\`'s post score is ${parseInt(row.total_chars, 10)} \n`;

                return this.buildPageEmbed(
                    context.config.color_hex,
                    `Top posters by score in ${message.guild?.name}`,
                    result,
                    pageNum,
                    totalPages,
                );
            },
        );
        context.pagination.sendPaginatedEmbed(message, pages);
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
        return new ScoreLister().process(message, context);
    },
} satisfies ICommand;
