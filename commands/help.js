const discord = require("discord.js")
const projectPackage = require("package.json")
const { config } = require("systems/settings")
const bot = require("systems/bot.js")

module.exports = {
    "name": "help",
    "description": "sends this helpful message",
    "format": "help",
    "function": function help(message) {
        let helpMessage = `**Here is a list of all the commands *you* can use: **
        Format: \`()\` = optional argument, \`[]\` = required argument\n`
        const args = message.content.split(" ")

        const commands = require("commandholders/commands.js")
        const pageAmount = Math.ceil(Object.entries(commands).length / 10)
        let pageNum = args[1] ? args[1] : 1

        if (pageNum > pageAmount)
            pageNum = pageAmount

        const start = (pageNum - 1) * 10
        let count = 0

        for (const [, command] of Object.entries(commands)) {
            count++
            if (count >= start && count <= start + 10)
                helpMessage += `\`${command.format}\`: ${command.description} \n`
        }

        const help = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(":robot: Current commands: :robot:")
            .setDescription(helpMessage)
            .setFooter(`Page ${pageNum}/${pageAmount} \nCurrent Version: ${projectPackage.version}`)

        return bot.message.send(message, { embeds: [help] })
    }
}