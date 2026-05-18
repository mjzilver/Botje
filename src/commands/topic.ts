import type { ICommand, IBotContext } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { extractTopics, fetchContextMessages } from "../systems/topicExtractor";
import { toError } from "../systems/utils";

export default {
    name: "topic",
    description: "Shows the current topic based on recent channel messages",
    format: "topic",
    async function(message: BotMessage, context: IBotContext): Promise<void> {
        let recent: BotMessage[] = [];

        try {
            recent = await fetchContextMessages(message.channel);
        } catch (err) {
            context.logger.error(toError(err));
            context.messageHandler.send(message, "Could not fetch recent messages.");
            return;
        }

        const topics = await extractTopics(recent, context.database, context.dictionary, context.config.prefix);

        if (topics.length === 0) {
            context.messageHandler.send(message, "No clear topic detected from recent messages.");
            return;
        }

        const extra = topics.length > 1 ? ` (related: ${topics.slice(1, 3).join(", ")})` : "";
        context.messageHandler.send(message, `Current topic: **${topics[0]}**${extra}`);
    },
} satisfies ICommand;
