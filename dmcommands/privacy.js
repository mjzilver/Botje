const discord = require("discord.js")
const projectPackage = require("package.json")
const config = require("config.json")
const fs = require("fs")
const bot = require("systems/bot.js")
const logger = require("systems/logger.js")

module.exports = {
    "name": "privacy",
    "description": "sends your botje's full privacy policy",
    "format": "privacy",
    "function": (message) => {
        fs.readFile("__dirname/../privacy_policy.txt", "utf8", (err, data) => {
            if (err) {
                logger.error("Could not read privacy policy")
                return
            }
            const privacyPolicy = data

            const help = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle("Current privacy policy:")
                .setDescription(privacyPolicy)
                .setFooter(`Current Version: ${projectPackage.version}`)

            return bot.message.send(message, { embeds: [help] })
        })
    }
}