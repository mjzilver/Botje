import type { ICommand } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import { normalizeSpaces, makeStringHelpers } from "../systems/stringHelpers";
import { extractNounTokens, tryFetchTopics } from "../systems/topicExtractor";
import { speakAbout } from "./speak";

export default {
    name: "about",
    description: "Makes the bot say something about a topic",
    format: "about [topic]",
    async function(message: BotMessage, context): Promise<void> {
        const { removeCommand } = makeStringHelpers(context.config);
        const phrase = normalizeSpaces(removeCommand(message.content));

        let topic: string;

        if (phrase) {
            topic = extractNounTokens(phrase)[0] ?? "";
            if (!topic) {
                context.messageHandler.reply(message, "Can't find a topic in that.");

                return;
            }
        } else {
            const topics = await tryFetchTopics(message, context);
            if (!topics) {
                context.messageHandler.reply(message, "Couldn't read recent messages.");

                return;
            }

            topic = topics[0] ?? "";
            if (!topic) {
                context.messageHandler.reply(message, "No clear topic in recent messages.");

                return;
            }
        }

        await speakAbout(topic, message, context);
    },
} satisfies ICommand;
