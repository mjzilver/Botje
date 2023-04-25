let discord = require("discord.js")
let projectPackage = require("package.json")
let config = require("config.json")
let bot = require("systems/bot.js")

module.exports = {
    "name": "help",
    "description": "sends this helpful message",
    "format": "help",
    "function": function help(message) {
        let helpMessage = "**Here is a list of all the commands *you* can use in private message (use b!help in a server to see server commands):  \n**"
        let commands = require("commandholders/dmcommands.js")

        for (const [, command] of Object.entries(commands)) {
            helpMessage += `\`${command.format}\`: ${command.description} \n`
        }

        const help = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(":robot: Current DirectMessage commands: :robot:")
            .setDescription(helpMessage)
            .setFooter(`Current Version: ${projectPackage.version}`)

        return bot.message.send(message, { embeds: [help] })
    }
}