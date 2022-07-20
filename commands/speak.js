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
    earliest.setMonth(earliest.getMonth() - 5)

    let topWordsSQL = `SELECT LOWER(message) as message, COUNT(*) as count
    FROM messages
    WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" 
    GROUP BY message
    HAVING count > 1
    ORDER BY count DESC 
    LIMIT 100`

    database.db.all(topWordsSQL, [], (err, filters) => {
        message.content = message.content.replace(new RegExp(/(\b|^| )(:.+:|<.+>)( *|$)/, "gi"), '')
        message.content = message.content.replace(new RegExp(/(\b)(bot(je)?)( *|\b)/, "gi"), '')
        message.content = message.content.textOnly()

        for (var i = 0; i < filters.length - 1; i++) {
            if (filters[i].message.textOnly()) {
                var regStr = `\\b(${filters[i].message})\\b`
                message.content = message.content.replace(new RegExp(regStr, "gi"), '').trim()
            }
        }

        var words = message.content.split(' ')
        if (words[0] == 'speak')
            words.shift()

        if (words && words.length >= 1 && words[0]) {
            if (words.length > 1) {
                words.sort(function (a, b) {
                    return b.length - a.length
                })
                if (randomBetween(0, 1))
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
                            logger.console(`Sending message with '${words.join(",")}' in it`)

                            var highestAmount = 0
                            var chosenMessage = ''

                            for (var i = 0; i < rows.length; i++) {
                                var amount = 0
                                for (var j = 0; j < words.length; j++) {
                                    if (rows[i]['message'].match(new RegExp(words[j], 'gmi'))) 
                                        amount += 30 - (j * j)
                                }
                                if (amount > highestAmount) {
                                    chosenMessage = rows[i]['message']
                                    highestAmount = amount
                                }
                            }

                            logger.console(`Sending message '${chosenMessage}' with score '${highestAmount}'`)
                            message.channel.send(chosenMessage)
                        } else
                            findRandom(message)
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
                            logger.console(`Sending message with '${words[0]}' in it`)
                            message.channel.send(row['message'].normalizeSpaces())
                        } else
                            findRandom(message)
                    }
                })
            }
        } else
            findRandom(message)
    })
}

function findRandom(message) {
    logger.console(`Sending randomly selected message`)

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
            message.channel.send(row['message'].normalizeSpaces())
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
            logger.console(`Not enough info about topic -- redirecting to the regular method`)
            message.content = message.content.replace(/(about|think|of)/ig, "")
            return findByWord(message)
        }

        var regStr = `\\b(is|are)\\b`

        var first = rows[0].message
        var second = rows[1].message
        var third = rows[2].message

        logger.console(`Picked terms related to '${topic}', first '${first}', second '${second}', third '${third}'`)

        first = first.substring(first.indexOf(topic.toLowerCase()))
        second = second.substring(second.indexOf(topic.toLowerCase()) + topic.length).replace(new RegExp(regStr, "gi"), '')
        third = third.substring(third.indexOf(topic.toLowerCase()) + topic.length).replace(new RegExp(regStr, "gi"), '')

        var linkerwords = ['and', 'or', 'but', 'also']

        var picker = randomBetween(0, 2)

        if (picker == 0)
            message.reply(`${first}`.normalizeSpaces())
        else if (picker == 1)
            message.reply(`${first} ${linkerwords.pickRandom()} ${second}`.normalizeSpaces())
        else
            message.reply(`${first}, ${second} ${linkerwords.pickRandom()} ${third}`.normalizeSpaces())
    })
}