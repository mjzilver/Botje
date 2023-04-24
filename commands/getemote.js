let fs = require("fs")
let bot = require("../systems/bot.js")

module.exports = {
    "name": "getemote",
    "description": "gets the emote",
    "format": "getemote [emote name]",
    "function": async function getemote(message) {
        let args = message.content.split(" ")
        args.shift()
        let path = `./backups/emotes/${message.guild.id}/`
        let files = fs.readdirSync(path)

        if (args[0] == "?") {
            let result = ""
            for (let i = 0; i < files.length; i++) {
                result += `${files[i]}, `
            }

            bot.message.reply(message, `Emotes backed up for this server: ${result}`)
        } else if (args[0]) {
            let filename = `${args[0]}.png`

            if (fs.existsSync(path + filename)) {
                bot.message.reply(message, { files: [path + filename] })
            } else {
                let closestFilename = bot.logic.findClosestMatchInList(filename, files)
                bot.message.reply(message, { files: [path + closestFilename] })
            }
        }
    }
}