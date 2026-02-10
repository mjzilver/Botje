const fs = require("fs")
const { pipeline } = require("stream/promises")

const axios = require("axios")

const bot = require("../../systems/bot")
const logger = require("../../systems/logger")

module.exports = async function addmeme(message) {
    const args = message.content.split(" ")
    args.shift()
    let url = ""

    if (message.reference && message.reference.messageId)
        url = getURL(await message.channel.messages.fetch(message.reference.messageId))
    else
        url = getURL(message)

    if (args[0]?.indexOf("http") === 0)
        url = args.shift()

    const filename = args[0] ? `${args[0] }.png` : `${new Date().getTime() }.png`

    if (url) {
        const path = "assets/meme_templates"

        try {
            const response = await axios.get(url, { responseType: "stream" })
            await pipeline(response.data, fs.createWriteStream(`${path}/${filename}`))
            bot.messageHandler.reply(message, `Added meme to the meme templates as ${filename}`)
            logger.warn(`Added meme to the meme templates as ${filename}`)
        } catch (err) {
            logger.error(err)
            bot.messageHandler.reply(message, "Failed to download meme")
        }
    }
}

function getURL(message) {
    if (message.attachments.size >= 1)
        return message.attachments.first().url
    else if (message.embeds.length >= 1)
        return message.embeds[0].url
    return ""
}