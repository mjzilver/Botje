const bot = require("../systems/bot")
const database = require("../systems/database")
const logger = require("../systems/logger")
const { randomBetween, levenshtein, pickRandomItem } = require("../systems/utils")
const { textOnly, removePrefix, normalizeSpaces } = require("../systems/stringHelpers")

module.exports = {
    "name": "speak",
    "description": "makes the bot speak via recycled messages",
    "format": "speak (sentence)",
    "options": [
        { type: "string", name: "sentence", description: "The sentence to base the response on", required: false }
    ],
    "function": async function speak(message) {
        const matches = textOnly(message.content).match(/(?:think of|about) +(.+)/i)

        if (matches && matches[1] !== "")
            await findTopic(message, matches[1])
        else
            await findByWord(message)
    }
}

async function findByWord(message) {
    const earliest = new Date()
    earliest.setMonth(earliest.getMonth() - 5)

    let _words = removePrefix(message.content)
        .replace(new RegExp(/(:.+:|<.+>|@.*|\b[a-z] |\bbot(?:je)?\b|http(.*)|speak)\b/gi), "")
    _words = textOnly(_words)
    _words = _words.replace(bot.dictionary.getNonSelectorsRegex(), "").trim()
    const words = _words.split(" ")

    if (words && words.length >= 1 && words[0]) {
        if (words.length > 1)
            words.sort((a, b) => {
                const al = a.match(/(?:[aeiouy]{1,2})/gi)
                const bl = b.match(/(?:[aeiouy]{1,2})/gi)
                return (bl ? bl.length : 0) - (al ? al.length : 0)
            })

        if (words.length > 1) {
            const selectSQL = `SELECT message FROM messages
                WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
                AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
                AND LENGTH(message) < 150 AND LENGTH(message) > 10
                AND datetime < ${message.createdAt.getTime()} AND datetime < ${earliest.getTime()}`

            const rows = await database.query(selectSQL, [])
            if (rows) {
                logger.debug(`Sending message with '${words.join(",")}'' in it`)

                let highestAmount = 0
                let chosenMessage = ""

                const regexPatterns = words.map(w => new RegExp(w, "gmi"))

                for (let i = 0; i < rows.length; i++) {
                    let amount = 0

                    for (let j = 0; j < regexPatterns.length; j++)
                        if (rows[i]["message"].match(regexPatterns[j]))
                            amount += 30 - (j * j)

                    if (amount > highestAmount)
                        if (levenshtein(rows[i]["message"], message.content) > 15) {
                            chosenMessage = rows[i]["message"]
                            highestAmount = amount
                        }
                }

                chosenMessage = chosenMessage.replace(new RegExp(/(@.*)(?:\s|\b|$)/, "gi"), "")
                logger.debug(`Sending message '${chosenMessage}' with score '${highestAmount}'`)
                bot.messageHandler.send(message, chosenMessage)
            }
        } else {
            const selectSQL = `SELECT message FROM messages
                WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
                AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
                AND message LIKE '%${words[0]}%' AND LENGTH(message) > 10
                AND datetime < ${message.createdAt.getTime()} AND datetime < ${earliest.getTime()} `

            const rows = await database.queryRandomMessage(selectSQL, [])
            if (rows) {
                logger.debug(`Sending message with '${words[0]}' in it`)
                bot.messageHandler.send(message, normalizeSpaces(rows[0]["message"]))
            }
        }
    } else {
        await findRandom(message)
    }
}

async function findRandom(message) {
    logger.debug("Sending randomly selected message")

    const earliest = new Date()
    earliest.setMonth(earliest.getMonth() - 5)

    const selectSQL = `SELECT message FROM messages
        WHERE message NOT LIKE '%http%' AND message NOT LIKE '%www%' AND message NOT LIKE '%bot%'
        AND message LIKE '%_ _%' AND message LIKE '%_ _%_%'
        AND datetime < ${earliest.getTime()} AND LENGTH(message) > 10 `

    const rows = await database.queryRandomMessage(selectSQL, [])
    if (rows)
                bot.messageHandler.send(message, normalizeSpaces(rows[0]["message"]))
}

async function findTopic(message, topic) {
    const selectSQL = `SELECT LOWER(message) as message
        FROM messages
        WHERE message LIKE '%${topic} is%' OR message LIKE '%${topic} are%' 
        AND message NOT LIKE '%<%' AND LENGTH(message) > 10`

    const rows = await database.query(selectSQL, [])
    if (rows.length < 3) {
        logger.debug("Not enough info about topic -- redirecting to the regular method")
        message.content = message.content.replace(/(about|think|of)/ig, "")
        return await findByWord(message)
    }

    const regStr = "\\b(is|are)\\b"

    let first = rows[0].message
    let second = rows[1].message
    let third = rows[2].message

    logger.debug(`Picked terms related to '${topic}', first '${first}', second '${second}', third '${third}'`)

    function extractTopicPhrase(message, topic, regStr, removeTopic = false) {
        const topicLower = topic.toLowerCase()
        const idx = message.indexOf(topicLower)
        if (idx === -1) return message
        const result = removeTopic
            ? message.substring(idx + topicLower.length)
            : message.substring(idx)
        return result.replace(new RegExp(regStr, "gi"), "").trim()
    }

    first = extractTopicPhrase(first, topic, "", false)
    second = extractTopicPhrase(second, topic, regStr, true)
    third = extractTopicPhrase(third, topic, regStr, true)

    const linkerwords = ["and", "or", "but", "also"]

    const picker = randomBetween(0, 2)

    if (picker === 0)
        bot.messageHandler.reply(message, normalizeSpaces(`${first}`))
    else if (picker === 1)
        bot.messageHandler.reply(message, normalizeSpaces(`${first} ${pickRandomItem(linkerwords)} ${second}`))
    else
        bot.messageHandler.reply(message, normalizeSpaces(`${first}, ${second} ${pickRandomItem(linkerwords)} ${third}`))
}