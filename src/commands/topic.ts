import type { ICommand, IBotContext } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { extractTopics } from "../systems/topicExtractor";
import { toError } from "../systems/utils";

const TOPIC_CONTEXT_WINDOW_MS = 10 * 60 * 60 * 1000;
const TOPIC_CONTEXT_LIMIT = 20;

export default {
    name: "topic",
    description: "Shows the current topic based on recent channel messages",
    format: "topic",
    async function(message: BotMessage, context: IBotContext): Promise<void> {
        let recent: BotMessage[] = [];

        try {
            const fetched = await message.channel.messages.fetch({ limit: TOPIC_CONTEXT_LIMIT });
            const cutoff = Date.now() - TOPIC_CONTEXT_WINDOW_MS;

            recent = [...fetched.values()].filter(
                (m) => !m.author.bot && m.createdTimestamp > cutoff,
            );
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
