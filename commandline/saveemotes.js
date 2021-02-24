const fs = require('fs')
const request = require('request');
const path = './emotes'

module.exports = function saveemotes(input) {
    for (const [guildID, guild] of bot.bot.guilds.cache.entries()) {
        var guildpath = path + '/' + guildID;

        if (!fs.existsSync(guildpath)) {
            fs.mkdirSync(guildpath)
            console.log(`Creating directory at ${guildpath}`)
        }

        for (const [emojiID, emoji] of guild.emojis.cache.entries()) {
            var emojilink = `https://cdn.discordapp.com/emojis/${emojiID}.png`
            var emojipath = guildpath + '/' + emoji.name + '.png';

            if (!fs.existsSync(emojipath) || fs.statSync(emojipath).size < 1000) {
                console.log(`Saving ${emoji.name} at ${emojipath} from ${emojilink}`)

                request(emojilink).pipe(fs.createWriteStream(emojipath)).on('error', function(err) {
                    console.error(err)
                })           
            }
        }
    }

}