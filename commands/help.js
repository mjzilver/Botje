const discord = require("discord.js")

const projectPackage = require("../package.json")
const { newPaginatedEmbed, createPages } = require("../systems/pagination")
const { config } = require("../systems/settings")

module.exports = {
    "name": "help",
    "description": "sends this helpful message",
    "format": "help",
    "function": async function help(message) {
        const commands = require("../systems/commandLoader").commands
        const commandList = Object.entries(commands).map(([, command]) => command)

        const pages = createPages(commandList, 10, (pageCommands, pageNum, totalPages) => {
            let helpMessage = `**Here is a list of all the commands *you* can use: **
        Format: \`()\` = optional argument, \`[]\` = required argument\n`

            for (const command of pageCommands)
                helpMessage += `\`${command.format}\`: ${command.description} \n`

            const embed = new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(":robot: Current commands: :robot:")
                .setDescription(helpMessage)
                .setFooter({ text: `Page ${pageNum}/${totalPages} \nCurrent Version: ${projectPackage.version}` })

            return embed
        })

        return newPaginatedEmbed(message, pages)
    }
}