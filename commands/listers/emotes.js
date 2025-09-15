const discord = require("discord.js")

const Lister = require("./lister.js")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { config } = require("../../systems/settings")

module.exports = {
    "name": "emotes",
    "description": "shows the top 10 emotes in the current channel or from the mentioned user",
    "format": "emotes (@user)",
    "function": message => {
        new EmotesLister().process(message)
    }
}

class EmotesLister extends Lister {
    constructor() {
        super()
    }

    total(message) {
        const selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE (message LIKE '%<%') AND message NOT LIKE '%@%'
            AND server_id = $1
            GROUP BY LOWER(message)
            HAVING COUNT(*)  > 1
            ORDER BY COUNT(*)  DESC 
            LIMIT 10`

        database.query(selectSQL, [message.guild.id], rows => {
            let result = ""
            for (let i = 0; i < rows.length; i++)
                result += `${rows[i]["message"]} was used ${rows[i]["count"]} times! \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 most used emotes in ${message.guild.name}`)
                .setDescription(result)

            bot.messageHandler.send(message, { embeds: [top] })
        })
    }

    mention(message, mentioned) {
        const selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE (message LIKE '%<%') AND message NOT LIKE '%@%'
            AND server_id = $1 AND user_id = $2
            GROUP BY LOWER(message)
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC 
            LIMIT 10`

        database.query(selectSQL, [message.guild.id, mentioned.id], rows => {
            let result = ""
            for (let i = 0; i < rows.length; i++)
                result += `${rows[i]["message"]} said ${rows[i]["count"]} times! \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 most used emotes in ${message.guild.name} used by ${mentioned.username}`)
                .setDescription(result)

            bot.messageHandler.send(message, { embeds: [top] })
        })
    }

    perPerson(message, page) {
        const selectSQL = `SELECT user_id, MODE() WITHIN GROUP (ORDER BY user_name) AS user_name, COUNT(*) as count
            FROM messages
            WHERE (message LIKE '%<%') AND message NOT LIKE '%@%'
            AND server_id = $1
            GROUP BY user_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`

        database.query(selectSQL, [message.guild.id], rows => {
            let result = ""
            for (let i = page * 10; i < rows.length && i <= (page * 10) + 9; i++)
                result += `${rows[i]["user_name"]} has posted ${rows[i]["count"]} emotes! \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 posters in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${(page + 1)} of ${Math.ceil(rows.length / 10)}` })

            bot.messageHandler.send(message, {
                embeds: [top]
            })
        })
    }

    percentage(message) {
        bot.messageHandler.reply(message, "This command does not work with %")
    }
}