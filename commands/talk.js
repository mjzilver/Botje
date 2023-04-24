let database = require("../systems/database.js")
let bot = require("../systems/bot.js")

module.exports = {
    "name": "talk",
    "description": "makes the bot talk via predictive text or as if it were the mentioned user",
    "format": "talk (@user)",
    "function": function talk(message) {
        let mention = message.mentions ? message.mentions.users.first() : null
        let chain = {}

        let selectSQL = `SELECT message FROM messages
        WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" `

        if (mention)
            selectSQL += `AND user_id = ${mention.id}`

        database.db.all(selectSQL, [], (err, rows) => {
            if (err)
                throw err
            else {
                for (let i = 0; i < rows.length; i++) {
                    const words = rows[i]["message"].split(" ")
                    let prevWord = ""

                    for (let j = 0; j < words.length; j++) {
                        let word = words[j].toLowerCase()

                        if (!chain[prevWord]) {
                            chain[prevWord] = [word]
                        } else {
                            chain[prevWord].push(word)
                        }
                        prevWord = word
                    }
                }

                let sentence = ""
                let sentenceLength = bot.logic.randomBetween(8, 15)

                if (chain[""]) {
                    let previousWord = chain[""][bot.logic.randomBetween(0, chain[""].length - 1)]
                    sentence += previousWord

                    for (let i = 0; i < sentenceLength - 1; i++) {
                        if (chain[previousWord]) {
                            let currentWord = chain[previousWord][bot.logic.randomBetween(0, chain[previousWord].length - 1)]

                            sentence += " " + currentWord
                            previousWord = currentWord
                        }
                    }

                    bot.message.send(message, sentence.capitalize())
                }
            }
        })
    }
}