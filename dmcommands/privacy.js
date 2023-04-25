let discord = require("discord.js")
let projectPackage = require("package.json")
let config = require("config.json")
const fs = require("fs")
let bot = require("systems/bot.js")

module.exports = {
    "name": "privacy",
    "description": "sends your botje's full privacy policy",
    "format": "privacy",
    "function": (message) => {
        fs.readFile("__dirname/privacy_policy.txt", "utf8", (err, data) => {
            if (err) {
                console.error(err)
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