const path = './emotes'

module.exports = function saveemotes(input) {
    for (const [guildID, guild] of bot.bot.guilds.cache.entries()) {
        var guildpath = path + '/' + guildID

        if (!fs.existsSync(guildpath)) {
            fs.mkdirSync(guildpath)
            console.log(`Creating directory at ${guildpath}`)
        }

        for (const [emojiID, emoji] of guild.emojis.cache.entries()) 
            backupsystem.saveEmoji(emoji)
    }
}