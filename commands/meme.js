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

        var topbottom = args.join(' ').split('|')
        var top = topbottom[0] ?? ''
        var bottom = topbottom[1] ?? ''

        if (args[0] == "?" || !args[0]) {
            var keyword = ''
            if (args[0] == "?" && args[1])
                keyword = args[1]

            var selectSQL = `SELECT message, LENGTH(message) as len, LENGTH(REPLACE(message, ' ', '')) as spaces 
                FROM messages
                WHERE ${keyword ? `message LIKE "%${keyword}%" AND` : ''} message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" 
                AND message NOT LIKE "%<%" AND message NOT LIKE "%:%" 
                AND len < 60 AND (len - spaces) >= 2 
                ORDER BY RANDOM()
                LIMIT 1`

            database.query(selectSQL, [], (rows) => {
                if (rows && rows[0]) {
                    var content = rows[0]['message']
                    var middle = content.lastIndexOf(' ', content.length / 2)
                    var top = content.substring(0, middle)
                    var bottom = content.substring(middle + 1)

                    return processPicture(url ?? null, top, bottom, message)
                } else {
                    bot.message.reply(message, `Can't find anything related, but this is your fault`)
                }
            })
        } else if (top) {
            if (url.match(/\.(jpeg|jpg|gif|png)/gi))
                return processPicture(url, top, bottom, message)
            else
                return processPicture(null, top, bottom, message)
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

    Jimp.read(url, (err, image) => {
        Jimp.loadFont('./assets/font.fnt').then(font => {
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
            image.write('./assets/meme.png', () => {
                bot.message.reply(message, {
                    files: ["./assets/meme.png"]
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
    else
        return ''
}