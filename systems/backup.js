class Backup {
    constructor() { }

    saveEmoji(emoji, filename = "") {
        var guildpath = './backups/emotes/' + emoji.guild.id
        var emojilink = `https://cdn.discordapp.com/emojis/${emoji.id}.png`
        var emojipath = guildpath + '/' + emoji.name + filename + '.png'

        if (!fs.existsSync(emojipath) || fs.statSync(emojipath).size < 10) {
            logger.console(`Saving ${emoji.name} at ${emojipath} from ${emojilink}`)

            request(emojilink).pipe(fs.createWriteStream(emojipath, { flags: 'w' })).on('error', function (err) {
                console.error(err)
            })
        }
    }
}

module.exports = new Backup()