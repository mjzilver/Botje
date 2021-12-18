module.exports = {
    'name': 'speak',
    'description': 'makes the bot speak via recycled messages',
    'format': 'speak (sentence)',
    'function': function speak(message, monthsOld = 5, findWord = 1) {
        var matches  = message.content.textOnly().match(/(?:think of|about) +(.+)/i)

        if (matches) {
            var topic = matches[1]

            if (topic != '') {
                let selectSQL = `SELECT LOWER(message) as message
                FROM messages
                WHERE message LIKE "%${topic} is%" OR message LIKE "%${topic} are%" 
                AND message NOT LIKE "%<%" AND message NOT LIKE "%:%" `

                database.db.all(selectSQL, [], (err, rows) => {
                    if (err)
                        throw err

                    if (rows.length < 3) {
                        logger.console(`Not enough info about topic -- redirecting to the regular method`)
                        message.content = message.content.replace(/(about|think|of)/ig, "")
                        return speak(message, --monthsOld, 0)
                    }

                    var regStr = `\\b(is|are)\\b`

                    var first = rows[randomBetween(0, rows.length - 1)].message
                    var second = rows[randomBetween(0, rows.length - 1)].message
                    var third = rows[randomBetween(0, rows.length - 1)].message

                    logger.console(`Picked terms related to ${topic}, first ${first}, second ${second}, third ${third}`)

                    first = first.substring(first.indexOf(topic.toLowerCase()))
                    second = second.substring(second.indexOf(topic.toLowerCase()) + topic.length).replace(new RegExp(regStr, "gi"), '')
                    third = third.substring(third.indexOf(topic.toLowerCase()) + topic.length).replace(new RegExp(regStr, "gi"), '')

                    var linkerwords = ['and', 'or', 'but', 'also']

                    var picker = randomBetween(0, 2)

                    if (picker == 0) {
                        message.reply(`${first}`.normalizeSpaces())
                    } else if (picker == 1) {
                        message.reply(`${first} ${linkerwords.pickRandom()} ${second}`.normalizeSpaces())
                    } else {
                        message.reply(`${first}, ${second} ${linkerwords.pickRandom()} ${third}`.normalizeSpaces())
                    }
                })
            } else {
                logger.console(`No topic found -- redirecting to the regular method`)

                message.content = message.content.replace(/about/ig, "")
                speak(message, --monthsOld, 0)
            }
        } else {
            var earliest = new Date()
            earliest.setMonth(earliest.getMonth() - monthsOld)

            let topWordsSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" 
            GROUP BY message
            HAVING count > 1
            ORDER BY count DESC 
            LIMIT 100`

            let selectSQL = `SELECT message, LENGTH(message) as len, LENGTH(REPLACE(message, ' ', '')) as spaces FROM messages
            WHERE message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" 
            AND len < 100 AND (len - spaces) >= 2 AND date < ${earliest.getTime()}
            ORDER BY RANDOM()
            LIMIT 1`

            database.db.all(topWordsSQL, [], (err, filters) => {
                if (findWord) {
                    message.content = message.content.replace(new RegExp(/(\b|^| )(:.+:|<.+>)( *|$)/, "gi"), '')
                    message.content = message.content.replace(new RegExp(/(\b)(bot(je)?)( *|\b)/, "gi"), '')
                    message.content = message.content.textOnly()

                    for (var i = 0; i < filters.length - 1; i++) {
                        if (filters[i].message.textOnly()) {
                            var regStr = `\\b(${filters[i].message})\\b`
                            message.content = message.content.replace(new RegExp(regStr, "gi"), '')
                        }
                    }

                    const words = message.content.split(' ')
                    if (words[0] == 'speak')
                        words.shift()

                    if (words && words.length >= 1 && words[0]) {
                        if (words.length > 1) {
                            words.sort(function (a, b) {
                                return b.length - a.length;
                            })
                            if (randomBetween(0, 1))
                                words.sort(function (a, b) {
                                    let al = a.match(/(?:[aeiouy]{1,2})/gi)
                                    let bl = b.match(/(?:[aeiouy]{1,2})/gi)
                                    return (bl ? bl.length : 0) - (al ? al.length : 0)
                                })
                        }

                        selectSQL = `SELECT message, LENGTH(message) as len, LENGTH(REPLACE(message, ' ', '')) as spaces FROM messages
                        WHERE message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" 
                        AND len < 100 AND (len - spaces) >= 2 
                        AND message LIKE "%${words[0]}%" AND date < ${message.createdAt.getTime()} AND date < ${earliest.getTime()}
                        ORDER BY RANDOM()
                        LIMIT 1`

                        logger.console(`Sending message with '${words[0]}' in it`)
                    } else
                        logger.console(`Sending message with no context - no suitable word found`)
                } else
                    logger.console(`Sending message with no context - no match in DB`)

                database.db.get(selectSQL, [], (err, row) => {
                    if (err)
                        throw err
                    else {
                        if (row)
                            message.channel.send(row['message'].normalizeSpaces())
                        else
                            speak(message, --monthsOld, 0)
                    }
                })
            })
        }
    }
}