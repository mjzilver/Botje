import type { ICommand, IBotContext } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { fetchTopicsFromContext } from "../systems/topicExtractor";
import { toError } from "../systems/utils";

export default {
    name: "topic",
    description: "Shows the current topic based on recent channel messages",
    format: "topic",
    async function(message: BotMessage, context: IBotContext): Promise<void> {
        let topics: string[];

        try {
            topics = await fetchTopicsFromContext(
                message.channel,
                context.database,
                context.dictionary,
                context.config.prefix,
            );
        } catch (err) {
            context.logger.error(toError(err));
            context.messageHandler.send(message, "Couldn't read recent messages.");

            return;
        }

        if (topics.length === 0) {
            context.messageHandler.send(message, "No clear topic in recent messages.");

            return;
        }

        const extra = topics.length > 1 ? ` (related: ${topics.slice(1, 3).join(", ")})` : "";
        context.messageHandler.send(message, `Current topic: **${topics[0]}**${extra}`);
    },
} satisfies ICommand;
