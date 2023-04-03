let fs = require('fs')

module.exports = {
    'name': 'saveemotes',
    'description': 'saves all emotes to /backups/emotes/guildid',
    'format': 'saveemotes?',
    'function': function saveemotes(input) {
        logger.console('Emotes are being saved')
        const path = './backups/emotes'

        for (const [guildId, guild] of bot.client.guilds.cache.entries()) {
            var guildpath = path + '/' + guildId

            if (!fs.existsSync(guildpath))
                fs.mkdirSync(guildpath)

            for (const [emojiId, emoji] of guild.emojis.cache.entries())
                bot.backup.saveEmoji(emoji)
        }
    }
} 