module.exports = {
    'name': 'talk',
    'description': 'makes the bot talk via predictive text or as if it were the mentioned user',
    'format': 'talk (@user)',
    'function': function talk(message) {
        var mention = message.mentions ? message.mentions.users.first() : null
        var chain = {}

        let selectSQL = `SELECT message FROM messages
        WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" `

        if (mention)
            selectSQL += `AND user_id = ${mention.id}`

        database.db.all(selectSQL, [], (err, rows) => {
            if (err)
                throw err
            else {
                for (var i = 0; i < rows.length; i++) {
                    const words = rows[i]['message'].split(' ')
                    var prevWord = ""

                    for (var j = 0; j < words.length; j++) {
                        var word = words[j].toLowerCase()

                        if (!chain[prevWord]) {
                            chain[prevWord] = [word]
                        } else {
                            chain[prevWord].push(word)
                        }
                        prevWord = word
                    }
                }

                var sentence = ""
                var sentenceLength = bot.logic.randomBetween(8, 15)

                if (chain[""]) {
                    var previousWord = chain[""][bot.logic.randomBetween(0, chain[""].length - 1)]
                    sentence += previousWord

                    for (i = 0; i < sentenceLength - 1; i++) {
                        if (chain[previousWord]) {
                            var currentWord = chain[previousWord][bot.logic.randomBetween(0, chain[previousWord].length - 1)]

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