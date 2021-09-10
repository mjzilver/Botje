module.exports = {
    'name': 'saveemotes',
    'description': 'saves all emotes to /backups/emotes/guildid',
    'format': 'saveemotes?',
    'function': function saveemotes(input) {
        logger.console('Emotes are being saved')
        const path = './backups/emotes'

        for (const [guildID, guild] of bot.client.guilds.cache.entries()) {
            var guildpath = path + '/' + guildID

            if (!fs.existsSync(guildpath))
                fs.mkdirSync(guildpath)

            for (const [emojiID, emoji] of guild.emojis.cache.entries())
                backupsystem.saveEmoji(emoji)
        }
    }
} 