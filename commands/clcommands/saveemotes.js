const fs = require("fs")
const bot = require("../../systems/bot")
const logger = require("../../systems/logger")

module.exports = {
    "name": "saveemotes",
    "description": "saves all emotes to /backups/emotes/guildid",
    "format": "saveemotes",
    "function": function saveemotes() {
        logger.console("Emotes are being saved")
        const path = "backups/emotes"

        for (const [guildId, guild] of bot.client.guilds.cache.entries()) {
            const guildpath = `${path }/${ guildId}`

            if (!fs.existsSync(guildpath))
                fs.mkdirSync(guildpath, { recursive: true })

            for (const [, emoji] of guild.emojis.cache.entries())
                bot.backupHandler.saveEmoji(emoji)
        }
    }
}