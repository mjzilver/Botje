let fs = require('fs')

module.exports = {
    'name': 'getemote',
    'description': 'gets the emote',
    'format': 'getemote [emote name]',
    'function': async function getemote(message) {
        var args = message.content.split(' ')
        args.shift()
        var path = `./backups/emotes/${message.guild.id}/`
        var files = fs.readdirSync(path)

        if (args[0] == "?") {
            var result = ""
            for (let i = 0; i < files.length; i++) {
                result += `${files[i]}, `
            }

            bot.message.reply(message, `Emotes backed up for this server: ${result}`)
        } else if (args[0]) {
            var filename = `${args[0]}.png`

            if (fs.existsSync(path + filename)) {
                bot.message.reply(message, { files: [path + filename] })
            } else {
                var closestFilename = bot.spellcheck.findClosestMatchInList(filename, files)
                bot.message.reply(message, { files: [path + closestFilename] })
            }
        }
    }
}