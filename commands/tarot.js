const path = require("path")

const discord = require("discord.js")
const Jimp = require("jimp")

const cardData = require("../json/card_data.json")
const bot = require("../systems/bot")
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
    "format": "tarot",
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

        const attachment = new discord.MessageAttachment(buffer, `${card.name_short}.png`)
        const tarotEmbed = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(`Your card is: ${card.name} ${isReversed ? "(Reversed)" : ""}`)
            .setImage(`attachment://${card.name_short}.png`)
            .addFields(
                { name: "Meaning", value: isReversed ? card.meaning_rev : card.meaning_up },
            )

        bot.messageHandler.reply(message, { embeds: [tarotEmbed], files: [attachment] })
    }
}