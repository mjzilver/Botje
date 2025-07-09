const bot = require("../systems/bot")
const { pickRandomItem } = require("../systems/utils")

module.exports = {
    "name": "choose",
    "description": "chooses one of the options given",
    "format": "choose [option] | [option2]",
    "function": async function choose(message) {
        const filtered = message.content.removePrefix().replace(/choose /g, "")
        const items = filtered.split("|")

        const presets = ["You should", "You ought to", "I pick", "I tell you", "An Angel told me in a dream that", "The tarot card reads"]

        if (items.length < 2)
            return bot.messageHandler.reply(message, `Please provide at least two options \nUse format \`${this.format}\``)

        return bot.messageHandler.reply(message, `${pickRandomItem(presets)} \`${pickRandomItem(presets).trim()}\``)
    }
}