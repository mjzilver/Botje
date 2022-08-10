module.exports = {
    'name': 'speak',
    'description': 'makes the bot speak via recycled messages',
    'format': 'speak (sentence)',
    'function': function speak(message) {
        var matches = message.content.textOnly().match(/(?:think of|about) +(.+)/i)

        if (matches && matches[1] != '') {
            findTopic(message, matches[1])
        } else {
            findByWord(message)
        }
    }
}

function findByWord(message) {
    var earliest = new Date()
    var editedText = message.content
    earliest.setMonth(earliest.getMonth() - 5)

    editedText = editedText.replace(new RegExp(/(:.+:|<.+>)(?:\s*|$)/, "gi"), '')
    editedText = editedText.replace(new RegExp(/(?:\b)(bot(?:je)?)(?:\s|\b)/, "gi"), '')
    editedText = editedText.replace(new RegExp(/(@.*)(?:\s|\b|$)/, "gi"), '')
    editedText = editedText.textOnly()
    editedText = editedText.replace(nonselector.getNonSelectorsRegex(), '').trim()

    var words = editedText.split(' ')
    if (words[0] == 'speak')
        words.shift()

    if (words && words.length >= 1 && words[0]) {
        if (words.length > 1) {
            words.sort(function (a, b) {
                return b.length - a.length
            })
            if (logic.randomBetween(0, 1))
                words.sort(function (a, b) {
                    let al = a.match(/(?:[aeiouy]{1,2})/gi)
                    let bl = b.match(/(?:[aeiouy]{1,2})/gi)
                    return (bl ? bl.length : 0) - (al ? al.length : 0)
                })
        }

        if (words.length > 1) {
            var selectSQL = `SELECT message, LENGTH(message) as len, LENGTH(REPLACE(message, ' ', '')) as spaces FROM messages
                WHERE message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" 
                AND len < 100 AND (len - spaces) >= 2 
                AND date < ${message.createdAt.getTime()} AND date < ${earliest.getTime()}
                ORDER BY RANDOM()`

            database.db.all(selectSQL, [], (err, rows) => {
                if (err)
                    throw err
                else {
                    if (rows) {
                        logger.debug(`Sending message with '${words.join(",")}' in it`)

                        var highestAmount = 0
                        var chosenMessage = ''

                        for (var i = 0; i < rows.length; i++) {
                            var amount = 0
                            for (var j = 0; j < words.length; j++) {
                                if (rows[i]['message'].match(new RegExp(words[j], 'gmi')))
                                    amount += 30 - (j * j)
                            }
                            if (amount > highestAmount) {
                                if (logic.levenshtein(rows[i]['message'], message.content) > 15) {
                                    chosenMessage = rows[i]['message']
                                    highestAmount = amount
                                }
                            }
                        }

                        chosenMessage = chosenMessage.replace(new RegExp(/(@.*)(?:\s|\b|$)/, "gi"), '')
                        logger.debug(`Sending message '${chosenMessage}' with score '${highestAmount}'`)
                        bot.message.send(message, chosenMessage)
                    }
                }
            })
        } else {
            var selectSQL = `SELECT message, LENGTH(message) as len, LENGTH(REPLACE(message, ' ', '')) as spaces FROM messages
                WHERE message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" 
                AND len < 100 AND (len - spaces) >= 2 
                AND message LIKE "%${words[0]}%" AND date < ${message.createdAt.getTime()} AND date < ${earliest.getTime()}
                ORDER BY RANDOM()
                LIMIT 1`

            database.db.get(selectSQL, [], (err, row) => {
                if (err)
                    throw err
                else {
                    if (row) {
                        logger.debug(`Sending message with '${words[0]}' in it`)
                        bot.message.send(message, row['message'].normalizeSpaces())
                    }
                }
            })
        }
    }

}

function findRandom(message) {
    logger.debug(`Sending randomly selected message`)

    var earliest = new Date()
    earliest.setMonth(earliest.getMonth() - 5)

    var selectSQL = `SELECT message, LENGTH(message) as len, LENGTH(REPLACE(message, ' ', '')) as spaces FROM messages
    WHERE message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" 
    AND len < 100 AND (len - spaces) >= 2 AND date < ${earliest.getTime()}
    ORDER BY RANDOM()
    LIMIT 1`

    database.db.get(selectSQL, [], (err, row) => {
        if (err)
            throw err
        else
            bot.message.send(message, row['message'].normalizeSpaces())
    })
}

function findTopic(message, topic) {
    var selectSQL = `SELECT LOWER(message) as message
    FROM messages
    WHERE message LIKE "%${topic} is%" OR message LIKE "%${topic} are%" 
    AND message NOT LIKE "%<%" AND message NOT LIKE "%:%"
    ORDER BY random() `

    database.db.all(selectSQL, [], (err, rows) => {
        if (err)
            throw err

        if (rows.length < 3) {
            logger.debug(`Not enough info about topic -- redirecting to the regular method`)
            message.content = message.content.replace(/(about|think|of)/ig, "")
            return findByWord(message)
        }

        var regStr = `\\b(is|are)\\b`

        var first = rows[0].message
        var second = rows[1].message
        var third = rows[2].message

        logger.debug(`Picked terms related to '${topic}', first '${first}', second '${second}', third '${third}'`)

        first = first.substring(first.indexOf(topic.toLowerCase()))
        second = second.substring(second.indexOf(topic.toLowerCase()) + topic.length).replace(new RegExp(regStr, "gi"), '')
        third = third.substring(third.indexOf(topic.toLowerCase()) + topic.length).replace(new RegExp(regStr, "gi"), '')

        var linkerwords = ['and', 'or', 'but', 'also']

        var picker = logic.randomBetween(0, 2)

        if (picker == 0)
            bot.message.reply(message, `${first}`.normalizeSpaces())
        else if (picker == 1)
            bot.message.reply(message, `${first} ${linkerwords.pickRandom()} ${second}`.normalizeSpaces())
        else
            bot.message.reply(message, `${first}, ${second} ${linkerwords.pickRandom()} ${third}`.normalizeSpaces())
    })
}