const database = require("../systems/database")

module.exports = {
    'name': 'speak',
    'description': 'makes the bot speak via recycled messages',
    'format': 'speak (sentence)',
    'function': function speak(message, monthsOld = 5, findWord = 1) {
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

                    logger.debug( `Sending message with '${words[0]}' in it`)
                } else
                    logger.debug( `Sending message with no context - no suitable word found`)
            } else
                logger.debug( `Sending message with no context - no match in DB`)

            database.db.get(selectSQL, [], (err, row) => {
                if (err)
                    throw err
                else {
                    if (row)
                        message.channel.send(row['message'].capitalize().normalizeSpaces())
                    else
                        speak(message, --monthsOld, 0)
                }
            })
        })
    }
}