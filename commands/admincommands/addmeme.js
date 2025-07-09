const fs = require("fs")

const request = require("request")

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

        request(url).pipe(fs.createWriteStream(`${path}/${filename}`)).on("finish", () => {
            bot.messageHandler.reply(message, `Added meme to the meme templates as ${filename}`)
            logger.warn(`Added meme to the meme templates as ${filename}`)
        })
    }
}

function getURL(message) {
    if (message.attachments.size >= 1)
        return message.attachments.first().url
    else if (message.embeds.length >= 1)
        return message.embeds[0].url
    return ""
}