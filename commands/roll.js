const bot = require("../systems/bot")
const { randomBetween } = require("../systems/utils")

module.exports = {
    "name": "roll",
    "description": "rolls a random number",
    "format": "roll",
    "options": [
        { type: "integer", name: "max", description: "Maximum value (default: current timestamp)", required: false },
        { type: "integer", name: "min", description: "Minimum value (default: 0)", required: false }
    ],
    "function": function roll(message) {
        const args = message.content.split(" ")

        if (args[1] && !isNaN(args[1])) {
            if (args[2] && !isNaN(args[2]))
                bot.messageHandler.reply(message, `You rolled ${randomBetween(parseInt(args[1]), parseInt(args[2]))} between ${args[1]} and ${args[2]}`)
            else
                bot.messageHandler.reply(message, `You rolled ${randomBetween(0, args[1])} out of ${args[1]}`)
        } else {
            const date = Date.now()
            bot.messageHandler.reply(message, `You rolled ${(date / 1000).toFixed(0)}`)
        }
    }
}