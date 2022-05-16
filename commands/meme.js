var Jimp = require("jimp");

module.exports = {
    'name': 'meme',
    'description': 'turn an image into a meme',
    'format': 'meme [link to image] [top text - bottom text]',
    'function': async function roll(message) {
        var args = message.content.split(' ')
        args.shift()
        var url = ''

        if (message.reference && message.reference.messageId) {
            var repliedTo = await message.channel.messages.fetch(message.reference.messageId)
            url = getURL(repliedTo)
        } else {
            url = getURL(message)
        }

        if (url !== '') {
            if (args[0].indexOf("http") == 0) {
                url = args[0]
                args.shift()
            }

            args = args.join(' ')
            args = args.split('-')

            var top = args[0]?.trim() ?? ''
            var bottom = args[1]?.trim() ?? ''

            processPicture(url, top, bottom, message)
        } else {
            message.reply("You must include a picture")
        }
    }
}

async function processPicture(url, top, bottom, message) {
    var image = await Jimp.read(url)
    const font = await Jimp.loadFont('./assets/font.fnt')

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
    await image.writeAsync('./assets/meme.png')

    message.reply({
        files: ["./assets/meme.png"]
    })
}

function getURL(message) {
    if (message.attachments.size >= 1)
        return message.attachments.first().url
    else if (message.embeds.length >= 1)
        return message.embeds[0].url
    else
        return ''
}