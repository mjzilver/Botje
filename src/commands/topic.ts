import type { ICommand, IBotContext } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { tryFetchTopics } from "../features/nlp/topicExtractor";

export default {
    name: "topic",
    description: "Shows the current topic based on recent channel messages",
    format: "topic",
    async function(message: BotMessage, context: IBotContext): Promise<void> {
        const topics = await tryFetchTopics(message, context);
        if (!topics) {
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
