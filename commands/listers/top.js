let discord = require("discord.js")
let config = require("config.json")
let database = require("systems/database.js")
const Lister = require("./lister.js")
let bot = require("systems/bot.js")

module.exports = {
    "name": "top",
    "description": "shows the top 10 emotes in the current channel or mentioned user",
    "format": "top (@user)",
    "function": (message) => {
        new TopLister().process(message)
    }
}

class TopLister extends Lister {
    constructor() {
        super()
    }

    perPerson(message) {
        let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
        FROM messages
        WHERE message NOT LIKE '%<%' AND server_id = $1
        GROUP BY LOWER(message)
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC 
        LIMIT 10`

        database.query(selectSQL, [message.guild.id], (rows) => {
            let result = ""
            for (let i = 0;
                (i < rows.length && i <= 10); i++)
                result += `${rows[i]["message"]} was said ${rows[i]["count"]} times \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 must used sentences in ${message.guild.name}`)
                .setDescription(result)

            bot.message.send(message, {
                embeds: [top]
            })
        })
    }

    mention(message, mentioned) {
        let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
        FROM messages
        WHERE message NOT LIKE '%<%' AND message NOT LIKE '%:%' 
        AND server_id = $1 AND user_id = $2
        GROUP BY LOWER(message)
        HAVING COUNT(*) > 1
        ORDER BY COUNT(*) DESC 
        LIMIT 10`

        database.query(selectSQL, [message.guild.id, mentioned.id], (rows) => {
            let result = ""
            for (let i = 0;
                (i < rows.length && i <= 10); i++)
                result += `${rows[i]["message"]} was said ${rows[i]["count"]} times \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 must used sentences in ${message.guild.name} by ${mentioned.username}`)
                .setDescription(result)

            bot.message.send(message, {
                embeds: [top]
            })
        })
    }
}