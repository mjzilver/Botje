import type { ICommand } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import emojiValues from "../json/emoji.json";
import { toError } from "../utils";

export default {
    name: "emoji",
    description: "turns your message into emojis",
    format: "emoji [string]",
    options: [{ type: "string", name: "text", description: "The text to convert into emojis", required: true }],
    async function(message, context) {
        if (message.type === 19) {
            const messageId = message.reference?.messageId;
            if (!messageId) return;
            let replyMessage: BotMessage;
            try {
                replyMessage = await message.channel.messages.fetch(messageId);
            } catch (err) {
                context.logger.error(toError(err));

                return;
            }

            const sentence = message.content.split(" ").slice(1).join(" ").toLowerCase();
            for (let i = 0; i < sentence.length; i++) {
                const c = sentence.charAt(i);
                if (c >= "a" && c <= "z")
                    context.messageHandler.react(replyMessage, (emojiValues as Record<string, string>)[`letter_${c}`]);
            }

            setTimeout(() => context.messageHandler.delete(message), 1000);
        } else {
            const sentence = message.content.split(" ").slice(1).join(" ").toLowerCase();
            let result = "";
            if (sentence.length > 0) {
                for (let i = 0; i < sentence.length; i++) {
                    const c = sentence.charAt(i);
                    if (c >= "a" && c <= "z") result += (emojiValues as Record<string, string>)[`letter_${c}`];
                    result += " ";
                }
            }

            context.messageHandler.send(message, result);
        }
    },
} satisfies ICommand;
