import path from "path";
import { EmbedBuilder, AttachmentBuilder } from "../interfaces/discord";
import Jimp from "jimp";
import type { ICommand } from "../interfaces";
import { makeStringHelpers } from "../systems/stringHelpers";
import { toError } from "../systems/utils";
import cardData from "../json/card_data.json";

interface TarotCard {
    type: "major" | "minor";
    value_int: number;
    name: string;
    name_short: string;
    suit?: string;
    meaning_up: string;
    meaning_rev: string;
}

export function guessFilename(card: TarotCard): string | null {
    if (card.type === "major") {
        return `${String(card.value_int).padStart(2, "0")}-${card.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}.png`;
    } else if (card.type === "minor") {
        if (!card.suit) return null;
        const suit = card.suit.charAt(0).toUpperCase() + card.suit.slice(1);
        const num = String(card.value_int).padStart(2, "0");

        return `${suit}${num}.png`;
    }

    return null;
}

export default {
    name: "tarot",
    description: "draws a tarot card specially for you",
    format: "tarot (question)",
    options: [{ type: "string", name: "question", description: "An optional question to ask the spirits" }],
    async function(message, context) {
        const { removeCommand } = makeStringHelpers(context.config);
        const card = cardData[Math.floor(Math.random() * cardData.length)] as TarotCard;
        const isReversed = Math.random() < 0.5;
        const filename = guessFilename(card);
        if (!filename) {
            context.logger.error(`Could not determine filename for card: ${card.name}`);

            return;
        }

        let image = await Jimp.read(path.join(__dirname, "../../assets/tarot", filename));
        if (isReversed) image = image.rotate(180);
        const buffer = await image.getBufferAsync(Jimp.MIME_PNG);
        const attachment = new AttachmentBuilder(buffer, { name: `${card.name_short}.png` });
        const userQuestion = removeCommand(message.content).trim();
        const meaning = isReversed ? card.meaning_rev : card.meaning_up;
        const tarotEmbed = new EmbedBuilder()
            .setColor(context.config.color_hex)
            .setTitle(`Your card is: ${card.name} ${isReversed ? "(Reversed)" : ""}`)
            .setImage(`attachment://${card.name_short}.png`)
            .addFields({ name: "Meaning", value: meaning });
        if (userQuestion && context.config.llm?.tarot_prompt) {
            await context.messageHandler.reply(message, { embeds: [tarotEmbed], files: [attachment] });
            const prompt = context.config.llm.tarot_prompt
                .replace("{userQuestion}", userQuestion)
                .replace("{cardName}", card.name)
                .replace("{orientation}", isReversed ? "reversed" : "upright")
                .replace("{meaning}", meaning);
            const interpretMsg = await message.channel.send("🔮 Divining your fortune...");
            try {
                await context.llm.streamToMessage(interpretMsg, prompt);
                await context.messageHandler.react(interpretMsg, "🔮");
            } catch (err) {
                context.logger.error(toError(err));
                await context.messageHandler.edit(
                    interpretMsg,
                    "You are mentally blocking the spirits from revealing your fortune. Try asking again while being more open to the mystical energies of the universe.",
                );
            }
        } else {
            await context.messageHandler.reply(message, { embeds: [tarotEmbed], files: [attachment] });
        }
    },
} satisfies ICommand;
