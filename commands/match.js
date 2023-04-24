let bot = require("../systems/bot.js")

module.exports = {
    "name": "match",
    "description": "Ignore this one",
    "format": "match [string]",
    "function": function match(message) {
        let words = message.content.split(" ")

        if (words[0] == "match")
            words.shift()

        let spellchecked = bot.spellcheck.checkSentence(words.join(" "))

        if (spellchecked.mistakes >= 1) {
            return bot.message.reply(message, `You made a mistake, it should be: \n"${spellchecked.result}"`)
        }
    }
}