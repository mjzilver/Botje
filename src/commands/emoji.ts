import * as discord from "discord.js";
import type { ICommand } from "../interfaces";
import type { BotMessage } from "../interfaces/discord";
import emojiValues from "../json/emoji.json";

export default {
    name: "emoji",
    description: "turns your message into emojis",
    format: "emoji [string]",
    options: [{ type: "string", name: "text", description: "The text to convert into emojis", required: true }],
    function(message, context) {
        if (message.type === discord.MessageType.Reply) {
            message.channel.messages.fetch(message.reference!.messageId!).then((result: BotMessage) => {
                const replyMessage = result;
                const sentence = message.content.split(" ").slice(1).join(" ").toLowerCase();
                for (let i = 0; i < sentence.length; i++) {
                    const c = sentence.charAt(i);
                    if (c >= "a" && c <= "z")
                        context.messageHandler.react(
                            replyMessage,
                            (emojiValues as Record<string, string>)[`letter_${c}`],
                        );
                }

                setTimeout(() => context.messageHandler.delete(message), 1000);
            });
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
