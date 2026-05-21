import type { ICommand, IBotContext } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { textOnly, normalizeSpaces, countVowelGroups, makeStringHelpers } from "../systems/stringHelpers";

function pickTopic(phrase: string, stopWords: Set<string>): string {
    const words = normalizeSpaces(textOnly(phrase))
        .toLowerCase()
        .split(" ")
        .filter((w) => w.length >= 3 && !stopWords.has(w));

    if (words.length === 0) return textOnly(phrase).split(" ").filter((w) => w.length >= 3)[0] ?? "";

    return words.sort((a, b) => countVowelGroups(b) - countVowelGroups(a))[0];
}

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

        const topic = pickTopic(phrase, context.dictionary.getStopWords());

        if (!topic) {
            context.messageHandler.reply(message, "Can't find a topic in that.");
            return;
        }

        const syntheticContent = `${context.config.prefix}speak about ${topic}`;
        const topicMessage = { ...message, content: syntheticContent };
        await context.loadedCommands.commands["speak"]?.function(topicMessage, context);
    },
} satisfies ICommand;
