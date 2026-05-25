import type { ICommand } from "../interfaces";
import { EmbedBuilder } from "../interfaces/discord";
import { colorHex } from "../systems/stringHelpers";
import { toError } from "../systems/utils";
import { getBotContext } from "../systems/botContext";

const POLL_EMOJIS = ["1️⃣", "2️⃣", "3️⃣", "4️⃣", "5️⃣"] as const;
const MAX_OPTIONS = 5;

export default {
    name: "poll",
    description: "creates a reaction-based poll",
    format: 'poll "[question]" [option] [option] (option) ...',
    async function(message) {
        const context = getBotContext();
        const raw = message.content.slice(message.content.indexOf(" ") + 1).trim();
        const questionMatch = /^"([^"]+)"(.*)$/.exec(raw);

        if (!questionMatch) {
            context.messageHandler.reply(
                message,
                'Usage: `!poll "Question?" option1 option2 ...` (quote the question)',
            );

            return;
        }

        const question = questionMatch[1].trim();
        const optionTokens = questionMatch[2]
            .trim()
            .split(/\s+/)
            .filter((s) => s.length > 0);

        if (optionTokens.length < 2) {
            context.messageHandler.reply(message, "A poll needs at least 2 options.");

            return;
        }

        if (optionTokens.length > MAX_OPTIONS) {
            context.messageHandler.reply(message, `A poll can have at most ${MAX_OPTIONS} options.`);

            return;
        }

        const description = optionTokens.map((opt, i) => `${POLL_EMOJIS[i]} ${opt}`).join("\n");

        const embed = new EmbedBuilder()
            .setColor(colorHex(context.config.color_hex))
            .setTitle(question)
            .setDescription(description)
            .setFooter({ text: `Poll by ${message.author.username}` });

        try {
            const sent = await context.messageHandler.send(message, embed);

            if (!sent) {
                return;
            }

            for (let i = 0; i < optionTokens.length; i++) {
                await context.messageHandler.react(sent, POLL_EMOJIS[i]);
            }
        } catch (err) {
            context.logger.error(toError(err));
        }
    },
} satisfies ICommand;
