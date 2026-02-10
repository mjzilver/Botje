const bot = require("../systems/bot")

module.exports = {
    "name": "match",
    "description": "checks your spelling and shows the correct sentence if you made a mistake",
    "format": "match [string]",
    "disabled": true,
    "function": function match(message) {
        const words = message.content.split(" ")

        if (words[0] === "match")
            words.shift()

        const spellchecked = bot.spellcheck.checkSentence(words.join(" "))

        if (spellchecked.mistakes >= 1)
            return bot.messageHandler.reply(message, `You made a mistake, it should be: \n"${spellchecked.result}"`)
    }
}