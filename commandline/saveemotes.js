let fs = require("fs")
let bot = require("../systems/bot.js")
let logger = require("../systems/logger.js")

module.exports = {
    "name": "saveemotes",
    "description": "saves all emotes to /backups/emotes/guildid",
    "format": "saveemotes?",
    "function": function saveemotes() {
        logger.console("Emotes are being saved")
        const path = "./backups/emotes"

        for (const [guildId, guild] of bot.client.guilds.cache.entries()) {
            let guildpath = path + "/" + guildId

            if (!fs.existsSync(guildpath))
                fs.mkdirSync(guildpath)

            for (const [, emoji] of guild.emojis.cache.entries())
                bot.backup.saveEmoji(emoji)
        }
    }
} 