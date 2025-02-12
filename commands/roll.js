const bot = require("systems/bot.js")

module.exports = {
    "name": "roll",
    "description": "gets you roll a number",
    "format": "roll",
    "function": function roll(message) {
        const args = message.content.split(" ")

        if (args[1] && !isNaN(args[1])) {
            if (args[2] && !isNaN(args[2])) {
                bot.messageHandler.reply(message, `You rolled ${bot.logic.randomBetween(parseInt(args[1]), parseInt(args[2]))} between ${args[1]} and ${args[2]}`)
            } else {
                bot.messageHandler.reply(message, `You rolled ${bot.logic.randomBetween(0, args[1])} out of ${args[1]}`)
            }
        } else {
            const date = Date.now()
            bot.messageHandler.reply(message, `You rolled ${(date / 1000).toFixed(0)}`)
        }
    }
}