const discord = require("discord.js")
const { config } = require("systems/settings")
const database = require("systems/database.js")
const Lister = require("./lister.js")
const bot = require("systems/bot.js")

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
            this.mention(message, mentioned, args[2].removeQuotes().toLowerCase())
        } else if (args[1] === "?" && args[2]) {
            this.perPerson(message, args[2].removeQuotes().toLowerCase())
        } else if (args[1] === "%" && args[2]) {
            this.percentage(message, args[2].removeQuotes().toLowerCase())
        } else if (args[1]) {
            this.total(message, args[1].removeQuotes().toLowerCase())
        } else {
            bot.messageHandler.send(message, `I have no idea what you want, format is as follows: '${module.exports.format}'`)
        }
    }

    perPerson(message, word) {
        const selectSQL = `SELECT user_id, MODE() WITHIN GROUP (ORDER BY user_name) AS user_name, count(message) as count
        FROM messages
        WHERE LOWER(message) LIKE $1 AND server_id = $2
        GROUP BY user_id
        HAVING count(message) > 1
        ORDER BY count(message) DESC 
        LIMIT 10`

        database.query(selectSQL, [`%${word}%`, message.guild.id], (rows) => {
            let result = ""
            for (let i = 0; (i < rows.length && i <= 10); i++)
                result += `${rows[i]["user_name"]} has said ${word} ${rows[i]["count"]} times! \n`

            if (result === "")
                return bot.messageHandler.send(message, `Nothing found for ${word} in ${message.guild.name} `)

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 users for the word ${word} in ${message.guild.name} `)
                .setDescription(result)

            bot.messageHandler.send(message, {
                embeds: [top]
            })
        })
    }

    total(message, word) {
        const selectSQL = `SELECT COUNT(*) as count
        FROM messages
        WHERE LOWER(message) LIKE $1 AND server_id = $2 `

        database.query(selectSQL, [`%${word}%`, message.guild.id], (rows) => {
            bot.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages in this server that contain ${word}`)
        })
    }

    mention(message, mentioned, word) {
        const selectSQL = `SELECT COUNT(*) as count
        FROM messages
        WHERE LOWER(message) LIKE $1 
        AND server_id = $2 AND user_id = $3 `

        database.query(selectSQL, [`%${word}%`, message.guild.id, mentioned.id], (rows) => {
            bot.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages from ${mentioned.username} in this server that contain ${word}`)
        })
    }

    percentage(message, word) {
        const selectSQL = `SELECT user_id, MODE() WITHIN GROUP (ORDER BY user_name) AS user_name, count(message) as count,
                (SElECT COUNT(m2.message) 
                FROM messages AS m2
                WHERE m2.user_id = messages.user_id
                AND m2.server_id = messages.server_id) as total
            FROM messages
            WHERE LOWER(message) LIKE $1
            AND server_id = $2
            GROUP BY messages.user_id, messages.server_id
            HAVING count(message) > 1
            ORDER BY count(message) DESC 
            LIMIT 10`

        database.query(selectSQL, [`%${word}%`, message.guild.id], (rows) => {
            let result = ""
            const resultArray = []
            for (let i = 0; (i < rows.length && i <= 10); i++) {
                const percentage = ((parseInt(rows[i]["count"]) / parseInt(rows[i]["total"])) * 100).toFixed(3)
                resultArray.push({ "percentage": percentage, "user_name": rows[i]["user_name"] })
            }
            resultArray.sort(function(a, b) { return b.percentage - a.percentage })

            for (let i = 0; i < resultArray.length; i++)
                result += `${resultArray[i]["user_name"]} has said ${word} in ${resultArray[i]["percentage"]}% of their messages! \n`

            if (result === "")
                return bot.messageHandler.send(message, `Nothing found for ${word} in ${message.guild.name} `)

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 users for the word ${word} in ${message.guild.name} `)
                .setDescription(result)

            bot.messageHandler.send(message, {
                embeds: [top]
            })
        })
    }
}