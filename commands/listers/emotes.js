let discord = require("discord.js")
let config = require("../../config.json")
let database = require("../../systems/database.js")
let Lister = require("./lister.js")
let bot = require("../../systems/bot.js")

module.exports = {
    "name": "emotes",
    "description": "shows the top 10 emotes in the current channel or from the mentioned user",
    "format": "emotes (@user)",
    "function": (message) => {
        new EmotesLister().process(message)
    }
}

class EmotesLister extends Lister {
    constructor() {
        super()
    }

    total(message) {
        let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE (message LIKE "%<%" OR message LIKE "%:%") AND message NOT LIKE "%@%"
            AND server = ?
            GROUP BY LOWER(message)
            HAVING count > 1
            ORDER BY count DESC 
            LIMIT 10`

        database.query(selectSQL, [message.guild.id], (rows) => {
            let result = ""
            for (let i = 0; i < rows.length; i++)
                result += `${rows[i]["message"]} said ${rows[i]["count"]} times! \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 most used emotes in ${message.guild.name}`)
                .setDescription(result)

            bot.message.send(message, { embeds: [top] })
        })
    }

    mention(message, mentioned) {
        let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE (message LIKE "%<%" OR message LIKE "%:%" ) AND message NOT LIKE "%@%"
            AND server = ? AND user_id = ?
            GROUP BY LOWER(message)
            HAVING count > 1
            ORDER BY count DESC 
            LIMIT 10`

        database.query(selectSQL, [message.guild.id, mentioned.id], (rows) => {
            let result = ""
            for (let i = 0; i < rows.length; i++)
                result += `${rows[i]["message"]} said ${rows[i]["count"]} times! \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 most used emotes in ${message.guild.name} used by ${mentioned.username}`)
                .setDescription(result)

            bot.message.send(message, { embeds: [top] })
        })
    }

    perPerson(message, page) {
        let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count
            FROM messages
            WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?
            GROUP BY LOWER(user_id)
            HAVING count > 1
            ORDER BY count DESC`

        database.query(selectSQL, [message.guild.id], (rows) => {
            let result = ""
            for (let i = page * 10; i < rows.length && i <= (page * 10) + 9; i++)
                result += `${rows[i]["user_name"]} has posted ${rows[i]["count"]} messages! \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 posters in ${message.guild.name}`)
                .setDescription(result)
                .setFooter(`Page ${(page + 1)} of ${Math.ceil(rows.length / 10)}`)

            bot.message.send(message, {
                embeds: [top]
            })
        })
    }

    percentage(message) {
        bot.message.reply(message, "This command does not work with %")
    }
}