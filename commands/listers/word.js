let discord = require("discord.js")
let config = require("config.json")
let database = require("systems/database.js")
const Lister = require("./lister.js")
let bot = require("systems/bot.js")

module.exports = {
    "name": "word",
    "description": "shows how many times a word has been said in the current channel, ? per user or from mentioned user",
    "format": "word (@user | ?) [word]",
    "function": (message) => {
        new WordLister().process(message)
    }
}

class WordLister extends Lister {
    constructor() {
        super()
    }

    process(message) {
        const args = message.content.match(/([^" ]+)|"([^"]+)"/gi)
        const mentioned = message.mentions.users.first()

        if (mentioned && args[2]) {
            this.mention(message, mentioned, args[2].removeQuotes())
        } else if (args[1] == "?" && args[2]) {
            this.perPerson(message, args[2].removeQuotes())
        } else if (args[1] == "%" && args[2]) {
            this.percentage(message, args[2].removeQuotes())
        } else if (args[1]) {
            this.total(message, args[1].removeQuotes())
        } else {
            bot.message.send(message, `I have no idea what you want, format is as follows: '${module.exports.format}'`)
        }
    }

    perPerson(message, word) {
        let selectSQL = `SELECT user_id, user_name, count(message) as count
        FROM messages
        WHERE message LIKE ? AND server = ?
        GROUP BY user_id
        HAVING count > 1
        ORDER BY count DESC 
        LIMIT 10`

        database.query(selectSQL, [`%${word}%`, message.guild.id], (rows) => {
            let result = ""
            for (let i = 0; (i < rows.length && i <= 10); i++)
                result += `${rows[i]["user_name"]} has said ${word} ${rows[i]["count"]} times! \n`

            if (result == "")
                return bot.message.send(message, `Nothing found for ${word} in ${message.guild.name} `)

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 users for the word ${word} in ${message.guild.name} `)
                .setDescription(result)

            bot.message.send(message, {
                embeds: [top]
            })
        })
    }

    total(message, word) {
        let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
        FROM messages
        WHERE message LIKE ? AND server = ? `

        database.query(selectSQL, [`%${word}%`, message.guild.id], (rows) => {
            bot.message.send(message, `Ive found ${rows[0]["count"]} messages in this server that contain ${word}`)
        })
    }

    mention(message, mentioned, word) {
        let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
        FROM messages
        WHERE message LIKE ? 
        AND server = ? AND user_id = ? `

        database.query(selectSQL, [`%${word}%`, message.guild.id, mentioned.id], (rows) => {
            bot.message.send(message, `Ive found ${rows[0]["count"]} messages from ${mentioned.username} in this server that contain ${word}`)
        })
    }

    percentage(message, word) {
        let selectSQL = `SELECT user_id, user_name, count(message) as count,
                (SElECT COUNT(m2.message) 
                FROM messages AS m2
                WHERE m2.user_id = messages.user_id
                AND m2.server = messages.server) as total
            FROM messages
            WHERE message LIKE ?
            AND server = ?
            GROUP BY messages.user_id
            HAVING count > 1
            ORDER BY count DESC 
            LIMIT 10`

        database.query(selectSQL, [`%${word}%`, message.guild.id], (rows) => {
            let result = ""
            let resultArray = []
            for (let i = 0; (i < rows.length && i <= 10); i++) {
                let percentage = ((parseInt(rows[i]["count"]) / parseInt(rows[i]["total"])) * 100).toFixed(3)
                resultArray.push({ "percentage": percentage, "user_name": rows[i]["user_name"] })
            }
            resultArray.sort(function (a, b) { return b.percentage - a.percentage })

            for (let i = 0; i < resultArray.length; i++)
                result += `${resultArray[i]["user_name"]} has said ${word} in ${resultArray[i]["percentage"]}% of their messages! \n`

            if (result == "")
                return bot.message.send(message, `Nothing found for ${word} in ${message.guild.name} `)

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 users for the word ${word} in ${message.guild.name} `)
                .setDescription(result)

            bot.message.send(message, {
                embeds: [top]
            })
        })
    }
}