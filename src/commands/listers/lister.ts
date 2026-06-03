import { EmbedBuilder, isGuildMessage } from "../../interfaces/discord";
import type { BotMessage, GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";
import { toError } from "../../systems/utils";

const LEADERBOARD_TRIGGERS = ["leaderboard", "top", "?"];
const PERCENT_TRIGGERS = ["percent", "percentage", "%"];
const ALL_FLAG_TRIGGERS = new Set([...LEADERBOARD_TRIGGERS, ...PERCENT_TRIGGERS]);

export interface ParsedArgs {
    mention:
        | {
              id: string;
              username?: string;
          }
        | undefined;
    leaderboard: boolean;
    percent: boolean;
    args: string[];
}

export abstract class Lister {
    protected parseArgs(
        message: BotMessage,
        options: {
            preserveQuotes?: boolean;
        } = {},
    ): ParsedArgs {
        const { preserveQuotes = false } = options;
        const rawArgs = preserveQuotes
            ? (message.content.match(/([^" ]+)|"([^"]+)"/gi) ?? [])
            : message.content.split(" ");
        const args = rawArgs.slice(1);
        const mention = message.mentions?.users?.first?.();
        const hasLeaderboard = args.some((a) => a && LEADERBOARD_TRIGGERS.includes(a.toLowerCase()));
        const hasPercent = args.some((a) => a && PERCENT_TRIGGERS.includes(a.toLowerCase()));
        const filteredArgs = args.filter((a) => a && !ALL_FLAG_TRIGGERS.has(a.toLowerCase()) && !a.startsWith("<@"));

        return { mention, leaderboard: hasLeaderboard, percent: hasPercent, args: filteredArgs };
    }

    async process(message: BotMessage, context: IBotContext): Promise<void> {
        if (!isGuildMessage(message)) {
            await context.messageHandler.reply(message, "This command only works in a server.");

            return;
        }

        const { mention, leaderboard, percent } = this.parseArgs(message);
        try {
            if (mention) await this.mention(message, mention, context);
            else if (leaderboard) await this.perPerson(message, context);
            else if (percent) await this.percentage(message, context);
            else await this.total(message, context);
        } catch (err) {
            context.logger.error(toError(err));
        }
    }

    async total(message: GuildBotMessage, context: IBotContext): Promise<void> {
        await context.messageHandler.reply(message, "This command does not work without further commands");
    }

    async mention(
        message: GuildBotMessage,
        _mention: {
            id: string;
        },
        context: IBotContext,
    ): Promise<void> {
        await context.messageHandler.reply(message, "This command does not work with @");
    }

    async perPerson(message: GuildBotMessage, context: IBotContext): Promise<void> {
        await context.messageHandler.reply(message, "This command does not work with ?");
    }

    async percentage(message: GuildBotMessage, context: IBotContext): Promise<void> {
        await context.messageHandler.reply(message, "This command does not work with %");
    }

    protected async sendPaginatedRows<T>(
        message: GuildBotMessage,
        context: IBotContext,
        rows: T[],
        title: string,
        formatRow: (row: T) => string | Promise<string>,
        emptyMessage?: string,
    ): Promise<void> {
        if (emptyMessage !== undefined && (!rows || rows.length === 0)) {
            await context.messageHandler.send(message, emptyMessage);

            return;
        }

        const pages = await context.pagination.createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = "";
            for (const row of pageRows) result += await formatRow(row);

            return this.buildPageEmbed(context.config.color_hex, title, result, pageNum, totalPages);
        });

        await context.pagination.sendPaginatedEmbed(message, pages);
    }

    protected buildPageEmbed(
        color: `#${string}`,
        title: string,
        description: string,
        pageNum: number,
        totalPages: number,
    ): EmbedBuilder {
        return new EmbedBuilder()
            .setColor(color)
            .setTitle(title)
            .setDescription(description)
            .setFooter({ text: `Page ${pageNum}/${totalPages}` });
    }
}
