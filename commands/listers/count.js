const discord = require("discord.js")
const { config } = require("systems/settings")
const database = require("systems/database.js")
const Lister = require("./lister.js")
const bot = require("systems/bot.js")

module.exports = {
    "name": "count",
    "description": "counts messages in the current channel or from the mentioned user",
    "format": "count (@user  ? | %)",
    "function": (message) => {
        new CountLister().process(message)
    }
}

class CountLister extends Lister {
    constructor() {
        super()
    }

    total(message) {
        const selectSQL = "SELECT COUNT(*) as count FROM messages WHERE server_id = $1"

        database.query(selectSQL, [message.guild.id], (rows) => {
            bot.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages in ${message.guild.name}`)
        })
    }

    mention(message, mentioned) {
        const selectSQL = "SELECT COUNT(*) as count FROM messages WHERE server_id = $1 AND user_id = $2"

        database.query(selectSQL, [message.guild.id, mentioned.id], (rows) => {
            bot.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages by ${mentioned.username} in this server`)
        })
    }

    perPerson(message, page) {
        const selectSQL = `SELECT user_id, MAX(user_name) as user_name, COUNT(*) as count
		FROM messages
		WHERE message NOT LIKE '%<%' AND message NOT LIKE '%:%' AND server_id = $1
		GROUP BY user_id
		HAVING COUNT(*) > 1
		ORDER BY COUNT(*) DESC`

        database.query(selectSQL, [message.guild.id], (rows) => {
            let result = ""
            for (let i = page * 10; i < rows.length && i <= (page * 10) + 9; i++)
                result += `${rows[i]["user_name"]} has posted ${rows[i]["count"]} messages! \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 posters in ${message.guild.name}`)
                .setDescription(result)
                .setFooter(`Page ${(page + 1)} of ${Math.ceil(rows.length / 10)}`)

            bot.messageHandler.send(message, {
                embeds: [top]
            })
        })
    }

    percentage(message, page) {
        const selectSQL = `SELECT user_id, MAX(user_name) as user_name, COUNT(*) as count,
			(SElECT COUNT(message) FROM messages WHERE message NOT LIKE '%<%' AND message NOT LIKE '%:%' AND server_id = $1) as total
			FROM messages
			WHERE message NOT LIKE '%<%' AND message NOT LIKE '%:%' AND server_id = $1
			GROUP BY user_id
			HAVING COUNT(*) > 1
			ORDER BY COUNT(*) DESC 
			LIMIT 10`

        database.query(selectSQL, [message.guild.id], (rows) => {
            let result = ""
            for (let i = page * 10; i < rows.length && i <= (page * 10) + 9; i++)
                result += `${rows[i]["user_name"]} has posted ${Math.round((parseInt(rows[i]["count"]) / parseInt(rows[i]["total"])) * 100)}% of all messages! \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 posters in ${message.guild.name}`)
                .setDescription(result)
                .setFooter(`Page ${(page + 1)} of ${Math.ceil(rows.length / 10)}`)

            bot.messageHandler.send(message, {
                embeds: [top]
            })
        })
    }
}