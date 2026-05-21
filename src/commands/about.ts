import type { ICommand, IBotContext } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { normalizeSpaces, makeStringHelpers } from "../systems/stringHelpers";
import { extractNounTokens } from "../systems/topicExtractor";

export default {
    name: "about",
    description: "Makes the bot say something about a topic",
    format: "about [topic]",
    async function(message: BotMessage, context: IBotContext): Promise<void> {
        const { removeCommand } = makeStringHelpers(context.config);
        const phrase = normalizeSpaces(removeCommand(message.content));

        if (!phrase) {
            context.messageHandler.reply(message, "Please provide a topic.");
            return;
        }

        const nouns = extractNounTokens(phrase);
        const topic = nouns[0] ?? "";

        if (!topic) {
            context.messageHandler.reply(message, "Can't find a topic in that.");
            return;
        }

        const syntheticContent = `${context.config.prefix}speak about ${topic}`;
        const topicMessage = { ...message, content: syntheticContent };
        await context.loadedCommands.commands["speak"]?.function(topicMessage, context);
    },
} satisfies ICommand;
