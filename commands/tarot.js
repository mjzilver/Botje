const path = require("path")

const discord = require("discord.js")
const Jimp = require("jimp")

const cardData = require("../json/card_data.json")
const bot = require("../systems/bot")
const llm = require("../systems/llm")
const logger = require("../systems/logger")
const { config } = require("../systems/settings")

function guessFilename(card) {
    if (card.type === "major") {
        return `${String(card.value_int).padStart(2, "0")}-${card.name.replace(/\s+/g, "").replace(/[^a-zA-Z0-9]/g, "")}.png`
    } else if (card.type === "minor") {
        const suit = card.suit.charAt(0).toUpperCase() + card.suit.slice(1)
        const num = String(card.value_int).padStart(2, "0")
        return `${suit}${num}.png`
    }
    return null
}

module.exports = {
    "name": "tarot",
    "description": "draws a tarot card specially for you",
    "format": "tarot [optional question]",
    "options": [
        { type: "string", name: "question", description: "An optional question to ask the spirits" }],
    "function": async function tarot(message) {
        const card = cardData[Math.floor(Math.random() * cardData.length)]
        const isReversed = Math.random() < 0.5

        const filename = guessFilename(card)
        if (!filename) {
            logger.error(`Could not determine filename for card: ${card.name}`)
            return
        }

        let image = await Jimp.read(
            path.join(__dirname, "../assets/tarot", filename)
        )

        if (isReversed)
            image = image.rotate(180)

        const buffer = await image.getBufferAsync(Jimp.MIME_PNG)

        const attachment = new discord.AttachmentBuilder(buffer, { name: `${card.name_short}.png` })

        const userQuestion = message.content.removeCommand().trim()
        const meaning = isReversed ? card.meaning_rev : card.meaning_up

        const tarotEmbed = new discord.EmbedBuilder()
            .setColor(config.color_hex)
            .setTitle(`Your card is: ${card.name} ${isReversed ? "(Reversed)" : ""}`)
            .setImage(`attachment://${card.name_short}.png`)
            .addFields(
                { name: "Meaning", value: meaning },
            )

        if (userQuestion && config.llm?.tarot_prompt) {
            await bot.messageHandler.reply(message, { embeds: [tarotEmbed], files: [attachment] })

            const prompt = config.llm.tarot_prompt
                .replace("{userQuestion}", userQuestion)
                .replace("{cardName}", card.name)
                .replace("{orientation}", isReversed ? "reversed" : "upright")
                .replace("{meaning}", meaning)

            const interpretMsg = await message.channel.send("🔮 Divining your fortune...")

            try {
                await llm.streamToMessage(interpretMsg, prompt)
                await bot.messageHandler.react(interpretMsg, "🔮")
            } catch (err) {
                logger.error("Failed to get tarot interpretation:", err)
                await bot.messageHandler.edit(interpretMsg, "You are mentally blocking the spirits from revealing your fortune. Try asking again while being more open to the mystical energies of the universe.")
            }
        } else {
            await bot.messageHandler.reply(message, { embeds: [tarotEmbed], files: [attachment] })
        }
    }
}