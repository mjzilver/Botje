var Jimp = require("jimp")

module.exports = {
    'name': 'meme',
    'description': 'turn an image into a meme, include picture by uploading, replying or URL',
    'format': 'meme (link to image) (top text) - (bottom text)',
    'function': async function meme(message) {
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

        args = args.join(' ').split('|')
        var top = args[0] ?? ''
        var bottom = args[1] ?? ''

        if (args[0]) {
            if (url.match(/\.(jpeg|jpg|gif|png)/gi))
                processPicture(url, top, bottom, message)
            else
                processPicture(null, top, bottom, message)
        } else {
            var selectSQL = `SELECT message, LENGTH(message) as len, LENGTH(REPLACE(message, ' ', '')) as spaces 
            FROM messages
            WHERE message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" 
            AND message NOT LIKE "%<%" AND message NOT LIKE "%:%" 
            AND len < 60 AND (len - spaces) >= 2 
            ORDER BY RANDOM()
            LIMIT 2`
            await database.query(selectSQL, [], (rows) => {
                processPicture(url ?? null, rows[0]['message'], rows[1]['message'], message)
            })
        }
    }
}

async function processPicture(url, top, bottom, message) {
    if (!url) {
        var path = './assets/meme_templates'
        var files = fs.readdirSync(path)
        let chosenFile = files[Math.floor(Math.random() * files.length)]
        url = `${path}/${chosenFile}`
    }
    top = top.toUpperCase().trim().replaceFancyQuotes()
    bottom = bottom.toUpperCase().trim().replaceFancyQuotes()

    var image = await Jimp.read(url)
    const font = await Jimp.loadFont('./assets/font.fnt')

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