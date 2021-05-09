module.exports = function talk(message) {
    var mention = message.mentions.users.first()
    var chain = {}

    let selectSQL = `SELECT message FROM messages
    WHERE server = ? 
    AND message NOT LIKE "%<%" AND message NOT LIKE "%:%" `

    if (mention)
        selectSQL += `AND user_id = ${mention.id}`

    database.db.all(selectSQL, [message.guild.id], (err, rows) => {
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
            var sentenceLength = randomBetween(5, 10)

            if (chain[""]) {
                var previousWord = chain[""][randomBetween(0, chain[""].length - 1)]
                sentence += previousWord

                for (i = 0; i < sentenceLength - 1; i++) {
                    if (chain[previousWord]) {
                        var currentWord = chain[previousWord][randomBetween(0, chain[previousWord].length - 1)]

                        sentence += " " + currentWord
                        previousWord = currentWord
                    }
                }
                
                message.channel.send(sentence.capitalize())
            }
        }
    })
}