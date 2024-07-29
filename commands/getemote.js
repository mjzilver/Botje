const fs = require("fs")
const bot = require("systems/bot.js")

module.exports = {
    "name": "getemote",
    "description": "gets the emote",
    "format": "getemote [emote name]",
    "function": async function getemote(message) {
        const args = message.content.split(" ")
        args.shift()
        const path = `backups/emotes/${message.guild.id}/`
        const files = fs.readdirSync(path)

        if (args[0] === "?") {
            let result = ""
            for (let i = 0; i < files.length; i++) {
                result += `${files[i]}, `
            }

            bot.messageHandler.reply(message, `Emotes backed up for this server: ${result}`)
        } else if (args[0]) {
            const filename = `${args[0]}.png`

            if (fs.existsSync(path + filename)) {
                bot.messageHandler.reply(message, { files: [path + filename] })
            } else {
                const closestFilename = bot.logic.findClosestMatchInList(filename, files)
                bot.messageHandler.reply(message, { files: [path + closestFilename] })
            }
        }
    }
}