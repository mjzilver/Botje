let database = require("systems/database.js")
let bot = require("systems/bot.js")
let logger = require("systems/logger.js")

module.exports = {
    "name": "speak",
    "description": "makes the bot speak via recycled messages",
    "format": "speak (sentence)",
    "function": function speak(message) {
        let matches = message.content.textOnly().match(/(?:think of|about) +(.+)/i)

        if (matches && matches[1] != "") {
            findTopic(message, matches[1])
        } else {
            findByWord(message)
        }
    }
}

function findByWord(message) {
    let earliest = new Date()
    earliest.setMonth(earliest.getMonth() - 5)

    let words = message.content.removePrefix()
        .replace(new RegExp(/(:.+:|<.+>|@.*|\b[a-z] |\bbot(?:je)?\b)/, "gi"), "")
        .textOnly()
        .replace(bot.dictionary.getNonSelectorsRegex(), "")
        .trim()
        .split(" ")

    if (words[0] == "speak")
        words.shift()

    if (words && words.length >= 1 && words[0]) {
        if (words.length > 1) {
            words.sort(function (a, b) {
                return b.length - a.length
            })
            if (bot.logic.randomBetween(0, 1))
                words.sort(function (a, b) {
                    let al = a.match(/(?:[aeiouy]{1,2})/gi)
                    let bl = b.match(/(?:[aeiouy]{1,2})/gi)
                    return (bl ? bl.length : 0) - (al ? al.length : 0)
                })
        }

        if (words.length > 1) {
            let selectSQL = `SELECT message FROM messages
                WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
                AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
                AND LENGTH(message) < 150
                AND datetime < ${message.createdAt.getTime()} AND datetime < ${earliest.getTime()}
                ORDER BY RANDOM()`

            database.query(selectSQL, [], (rows) => {
                if (rows) {
                    logger.debug(`Sending message with '${words.join(",")}' in it`)

                    let highestAmount = 0
                    let chosenMessage = ""

                    const regexPatterns = words.map(w => new RegExp(w, "gmi"))

                    for (let i = 0; i < rows.length; i++) {
                        let amount = 0

                        for (let j = 0; j < regexPatterns.length; j++) {
                            if (rows[i]["message"].match(regexPatterns[j])) {
                                amount += 30 - (j * j)
                            }
                        }

                        if (amount > highestAmount) {
                            if (bot.logic.levenshtein(rows[i]["message"], message.content) > 15) {
                                chosenMessage = rows[i]["message"]
                                highestAmount = amount
                            }
                        }
                    }

                    chosenMessage = chosenMessage.replace(new RegExp(/(@.*)(?:\s|\b|$)/, "gi"), "")
                    logger.debug(`Sending message '${chosenMessage}' with score '${highestAmount}'`)
                    bot.message.send(message, chosenMessage)
                }
            })
        } else {
            let selectSQL = `SELECT message FROM messages
                WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
                AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
                AND message LIKE '%${words[0]}%'
                AND datetime < ${message.createdAt.getTime()} AND datetime < ${earliest.getTime()}
                ORDER BY RANDOM()
                LIMIT 1`

            database.query(selectSQL, [], (rows) => {
                if (rows) {
                    logger.debug(`Sending message with '${words[0]}' in it`)
                    bot.message.send(message, rows[0]["message"].normalizeSpaces())
                }
            })
        }
    } else {
        findRandom(message)
    }
}

function findRandom(message) {
    logger.debug("Sending randomly selected message")

    let earliest = new Date()
    earliest.setMonth(earliest.getMonth() - 5)

    let selectSQL = `SELECT message FROM messages
        WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
        AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
        AND datetime < ${earliest.getTime()}
        ORDER BY RANDOM()
        LIMIT 1`

    database.query(selectSQL, [], (rows) => {
        if (rows)
            bot.message.send(message, rows[0]["message"].normalizeSpaces())
    })
}

function findTopic(message, topic) {
    let selectSQL = `SELECT LOWER(message) as message
        FROM messages
        WHERE message LIKE '%${topic} is%' OR message LIKE '%${topic} are%' 
        AND message NOT LIKE '%<%'
        ORDER BY random() `

    database.query(selectSQL, [], (rows) => {
        if (rows.length < 3) {
            logger.debug("Not enough info about topic -- redirecting to the regular method")
            message.content = message.content.replace(/(about|think|of)/ig, "")
            return findByWord(message)
        }

        let regStr = "\\b(is|are)\\b"

        let first = rows[0].message
        let second = rows[1].message
        let third = rows[2].message

        logger.debug(`Picked terms related to '${topic}', first '${first}', second '${second}', third '${third}'`)

        first = first.substring(first.indexOf(topic.toLowerCase()))
        second = second.substring(second.indexOf(topic.toLowerCase()) + topic.length).replace(new RegExp(regStr, "gi"), "")
        third = third.substring(third.indexOf(topic.toLowerCase()) + topic.length).replace(new RegExp(regStr, "gi"), "")

        let linkerwords = ["and", "or", "but", "also"]

        let picker = bot.logic.randomBetween(0, 2)

        if (picker == 0)
            bot.message.reply(message, `${first}`.normalizeSpaces())
        else if (picker == 1)
            bot.message.reply(message, `${first} ${linkerwords.pickRandom()} ${second}`.normalizeSpaces())
        else
            bot.message.reply(message, `${first}, ${second} ${linkerwords.pickRandom()} ${third}`.normalizeSpaces())
    })
}