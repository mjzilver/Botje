let fs = require('fs')
let request = require('request')

module.exports = async function addmeme(message) {
    var args = message.content.split(' ')
    args.shift()
    var url = ''

    if (message.reference && message.reference.messageId) {
        var repliedTo = await message.channel.messages.fetch(message.reference.messageId)
        url = getURL(repliedTo)
    } else {
        url = getURL(message)
    }

    if (args[0]?.indexOf("http") == 0)
        url = args.shift()

    var filename = args[0] ? args[0] + ".png" : new Date().getTime() + ".png"

    if (url) {
        var path = './assets/meme_templates'

        request(url).pipe(fs.createWriteStream(`${path}/${filename}`)).on('finish', function () {
            bot.message.reply(message, `Added meme to the meme templates as ${filename}`)
            logger.warn(`Added meme to the meme templates as ${filename}`)
        })
    }
}

function getURL(message) {
    if (message.attachments.size >= 1)
        return message.attachments.first().url
    else if (message.embeds.length >= 1)
        return message.embeds[0].url
    else
        return ''
}