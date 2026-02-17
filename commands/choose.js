const bot = require("../systems/bot")
const { pickRandomItem } = require("../systems/utils")
const { removePrefix } = require("../systems/stringHelpers")

module.exports = {
    "name": "choose",
    "description": "chooses one of the options given",
    "format": "choose [option] | [option2]",
    "options": [
        { type: "string", name: "choices", description: "Options separated by | (e.g., pizza | pasta | salad)", required: true }
    ],
    "function": async function choose(message) {
        const filtered = removePrefix(message.content).replace(/choose /g, "")
        const items = filtered.split("|")

        const presets = ["You should", "You ought to", "I pick", "I tell you", "An Angel told me in a dream that", "The tarot card reads"]

        if (items.length < 2)
            return bot.messageHandler.reply(message, `Please provide at least two options \nUse format \`${this.format}\``)

        return bot.messageHandler.reply(message, `${pickRandomItem(presets)} \`${pickRandomItem(items).trim()}\``)
    }
}