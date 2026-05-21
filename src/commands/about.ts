import type { ICommand, IBotContext } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { normalizeSpaces, makeStringHelpers } from "../systems/stringHelpers";
import { extractNounTokens, extractTopics, fetchContextMessages } from "../systems/topicExtractor";
import { toError } from "../systems/utils";

export default {
    name: "about",
    description: "Makes the bot say something about a topic",
    format: "about [topic]",
    async function(message: BotMessage, context: IBotContext): Promise<void> {
        const { removeCommand } = makeStringHelpers(context.config);
        const phrase = normalizeSpaces(removeCommand(message.content));

        let topic = "";

        if (phrase) {
            topic = extractNounTokens(phrase)[0] ?? "";
            if (!topic) {
                context.messageHandler.reply(message, "Can't find a topic in that.");
                return;
            }
        } else {
            let recent: BotMessage[] = [];
            try {
                recent = await fetchContextMessages(message.channel);
            } catch (err) {
                context.logger.error(toError(err));
                context.messageHandler.reply(message, "Couldn't read recent messages.");
                return;
            }
            const topics = await extractTopics(recent, context.database, context.dictionary, context.config.prefix);
            topic = topics[0] ?? "";
            if (!topic) {
                context.messageHandler.reply(message, "No clear topic in recent messages.");
                return;
            }
        }

        const syntheticContent = `${context.config.prefix}speak about ${topic}`;
        const topicMessage = Object.assign(Object.create(message as object) as BotMessage, { content: syntheticContent });
        await context.loadedCommands.commands["speak"]?.function(topicMessage, context);
    },
} satisfies ICommand;
