const database = require("../systems/database")
const bot = require("../systems/bot")
const { randomBetween } = require("../systems/utils")

module.exports = {
    "name": "talk",
    "description": "makes the bot talk via predictive text or as if it were the mentioned user",
    "format": "talk (@user)",
    "function": function talk(message) {
        const mention = message.mentions ? message.mentions.users.first() : null
        const chain = {}

        let selectSQL = `SELECT message FROM messages
        WHERE message NOT LIKE '%<%' `

        if (mention)
            selectSQL += `AND user_id = ${mention.id}`

        database.query(selectSQL, [], (rows) => {
            for (let i = 0; i < rows.length; i++) {
                const words = rows[i]["message"].split(" ")
                let prevWord = ""

                for (let j = 0; j < words.length; j++) {
                    const word = words[j].toLowerCase()

                    if (!chain[prevWord]) {
                        chain[prevWord] = [word]
                    } else {
                        if (!Array.isArray(chain[prevWord]))
                            chain[prevWord] = []
                        chain[prevWord].push(word)
                    }
                    prevWord = word
                }
            }

            let sentence = ""
            const sentenceLength = randomBetween(8, 15)

            if (chain[""]) {
                let previousWord = chain[""][randomBetween(0, chain[""].length - 1)]
                sentence += previousWord

                for (let i = 0; i < sentenceLength - 1; i++)
                    if (chain[previousWord]) {
                        const currentWord = chain[previousWord][randomBetween(0, chain[previousWord].length - 1)]

                        sentence += ` ${ currentWord}`
                        previousWord = currentWord
                    }

                bot.messageHandler.send(message, sentence.capitalize())
            }
        })
    }
}