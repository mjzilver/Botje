const fs = require("fs")

const discord = require("discord.js")

const bot = require("../systems/bot")
const { sendPaginatedEmbed, createPages } = require("../systems/pagination")
const { config } = require("../systems/settings")
const { findClosestMatchInList } = require("../systems/utils")

module.exports = {
    "name": "getemote",
    "description": "gets the emote, or lists all emotes if no name provided",
    "format": "getemote (emote name)",
    "options": [
        { type: "string", name: "emote", description: "The name of the emote to retrieve", required: false }
    ],
    "function": async function getemote(message) {
        const args = message.content.split(" ")
        args.shift()
        const path = `backups/emotes/${message.guild.id}/`
        const files = fs.readdirSync(path)

        if (!args[0]) {
            const emoteNames = files.map(f => f.replace(".png", ""))

            const pages = createPages(emoteNames, 50, (pageEmotes, pageNum, totalPages) => {
                const result = pageEmotes.join(", ")

                return new discord.EmbedBuilder()
                    .setColor(config.color_hex)
                    .setTitle(`Emotes backed up for ${message.guild.name}`)
                    .setDescription(result)
                    .setFooter({ text: `Page ${pageNum}/${totalPages} | Total: ${emoteNames.length} emotes` })
            })

            sendPaginatedEmbed(message, pages)
        } else {
            const filename = `${args[0]}.png`

            if (fs.existsSync(path + filename)) {
                bot.messageHandler.reply(message, { files: [path + filename] })
            } else {
                const closestFilename = findClosestMatchInList(filename, files)
                bot.messageHandler.reply(message, { files: [path + closestFilename] })
            }
        }
    }
}