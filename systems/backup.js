const fs = require("fs")
const request = require("request")
const logger = require("systems/logger.js")

class Backup {
    constructor() { }

    saveEmoji(emoji, filename = "") {
        const guildpath = `backups/emotes/${ emoji.guild.id}`
        const emojilink = `https://cdn.discordapp.com/emojis/${emoji.id}.png`
        const emojipath = `${guildpath }/${ emoji.name }${filename }.png`

        if (!fs.existsSync(emojipath) || fs.statSync(emojipath).size < 10) {
            logger.console(`Saving ${emoji.name} at ${emojipath} from ${emojilink}`)

            request(emojilink).pipe(fs.createWriteStream(emojipath, { flags: "w" })).on("error", function(err) {
                logger.error(err)
            })
        }
    }
}

module.exports = new Backup()