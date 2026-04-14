import { EmbedBuilder, isGuildMessage } from "../../interfaces/discord";
import type { BotMessage, GuildBotMessage } from "../../interfaces/discord";
import type { IBotContext } from "../../interfaces";

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
        const mention = message.mentions?.users?.first?.() as
            | {
                  id: string;
                  username?: string;
              }
            | undefined;
        const hasLeaderboard = args.some((a) => a && LEADERBOARD_TRIGGERS.includes(a.toLowerCase()));
        const hasPercent = args.some((a) => a && PERCENT_TRIGGERS.includes(a.toLowerCase()));
        const filteredArgs = args.filter((a) => a && !ALL_FLAG_TRIGGERS.has(a.toLowerCase()) && !a.startsWith("<@"));

        return { mention, leaderboard: hasLeaderboard, percent: hasPercent, args: filteredArgs };
    }

    process(message: BotMessage, context: IBotContext): void {
        if (!isGuildMessage(message)) {
            context.messageHandler.reply(message, "This command only works in a server.");

            return;
        }

        const { mention, leaderboard, percent } = this.parseArgs(message);
        if (mention) this.mention(message, mention, context);
        else if (leaderboard) this.perPerson(message, context);
        else if (percent) this.percentage(message, context);
        else this.total(message, context);
    }

    total(message: GuildBotMessage, context: IBotContext): void {
        context.messageHandler.reply(message, "This command does not work without further commands");
    }

    mention(
        message: GuildBotMessage,
        _mention: {
            id: string;
        },
        context: IBotContext,
    ): void {
        context.messageHandler.reply(message, "This command does not work with @");
    }

    perPerson(message: GuildBotMessage, context: IBotContext): void {
        context.messageHandler.reply(message, "This command does not work with ?");
    }

    percentage(message: GuildBotMessage, context: IBotContext): void {
        context.messageHandler.reply(message, "This command does not work with %");
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
