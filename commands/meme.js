const Jimp = require("jimp")
const fs = require("fs")
const database = require("systems/database.js")
const bot = require("systems/bot.js")

module.exports = {
    "name": "meme",
    "description": "turn an image into a meme, include picture by uploading, replying or URL",
    "format": "meme (link to image) (top text) - (bottom text)",
    "function": async function meme(message) {
        const args = message.content.split(" ")
        args.shift()
        let url = ""

        if (message.reference && message.reference.messageId)
            url = getURL(await message.channel.messages.fetch(message.reference.messageId))
        else
            url = getURL(message)


        if (args[0]?.indexOf("http") === 0)
            url = args.shift()

        const [top, bottom] = (args.join(" ").split("|") || []).slice(0, 2)

        if (args[0] === "?" || !args[0]) {
            let keyword = ""
            if (args[0] === "?" && args[1])
                keyword = args[1]

            const selectSQL = `SELECT message
                FROM messages
                WHERE message LIKE $1 AND
                message NOT LIKE '%http%'
                AND message NOT LIKE '%<%'
                AND LENGTH(message) < 70 
                ORDER BY RANDOM()
                LIMIT 1`

            database.query(selectSQL, [`%${keyword}%`], (rows) => {
                if (rows && rows[0]) {
                    const content = rows[0]["message"]
                    const middle = content.lastIndexOf(" ", content.length / 2)
                    const top = content.substring(0, middle)
                    const bottom = content.substring(middle + 1)

                    return processPicture(url ?? null, top, bottom, message)
                }
                bot.message.reply(message, "Can't find anything related, but this is your fault")
            })
        } else if (top) {
            if (url.match(/\.(jpeg|jpg|gif|png)/gi))
                return processPicture(url, top, bottom, message)
            return processPicture(null, top, bottom, message)
        }
    }
}

async function processPicture(url, top, bottom, message) {
    if (!url) {
        const path = "assets/meme_templates"
        const files = fs.readdirSync(path)
        const chosenFile = files[Math.floor(Math.random() * files.length)]
        url = `${path}/${chosenFile}`
    }
    top = top ? top.toUpperCase().trim().replaceFancyQuotes() : ""
    bottom = bottom ? bottom.toUpperCase().trim().replaceFancyQuotes() : ""

    Jimp.read(url, (err, image) => {
        Jimp.loadFont("assets/font.fnt").then(font => {
            image = image.resize(800, Jimp.AUTO)

            image.print(font, 0, 0, {
                text: top,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_TOP
            }, image.bitmap.width, image.bitmap.height * 0.1)
            image.print(font, 0, image.bitmap.height * 0.9, {
                text: bottom,
                alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
                alignmentY: Jimp.VERTICAL_ALIGN_BOTTOM
            }, image.bitmap.width, image.bitmap.height * 0.1)
            image.write("assets/meme.png", () => {
                bot.message.reply(message, {
                    files: ["assets/meme.png"]
                })
            })
        })
    })
}

function getURL(message) {
    if (message.attachments.size >= 1)
        return message.attachments.first().url
    else if (message.embeds.length >= 1)
        return message.embeds[0].url
    return ""
}