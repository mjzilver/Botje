const discord = require("discord.js")

const Lister = require("./lister.js")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { sendPaginatedEmbed, createPages } = require("../../systems/pagination")
const { config } = require("../../systems/settings")

module.exports = {
    "name": "count",
    "description": "counts messages in the server",
    "format": "count | count @user | count top | count percent",
    "subcommands": [
        { name: "total", description: "Show total message count" },
        { name: "top", description: "Show top message posters" },
        { name: "percent", description: "Show percentage breakdown by user" },
        { name: "user", description: "Show message count for a specific user", options: [
            { type: "user", name: "user", description: "The user to check", required: true }
        ] }
    ],
    "function": message => {
        new CountLister().process(message)
    }
}

class CountLister extends Lister {
    constructor() {
        super()
    }

    total(message) {
        const selectSQL = "SELECT COUNT(*) as count FROM messages WHERE server_id = $1"

        database.query(selectSQL, [message.guild.id], rows => {
            bot.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages in ${message.guild.name}`)
        })
    }

    mention(message, mentioned) {
        const selectSQL = "SELECT COUNT(*) as count FROM messages WHERE server_id = $1 AND user_id = $2"

        database.query(selectSQL, [message.guild.id, mentioned.id], rows => {
            bot.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages by ${mentioned.username} in this server`)
        })
    }

    perPerson(message) {
        const selectSQL = `SELECT user_id, MODE() WITHIN GROUP (ORDER BY user_name) AS user_name, COUNT(*) as count
            FROM messages
            WHERE server_id = $1
            GROUP BY user_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC `

        database.query(selectSQL, [message.guild.id], rows => {
            const pages = createPages(rows, 10, (pageRows, pageNum, totalPages) => {
                let result = ""
                for (const row of pageRows)
                    result += `${row["user_name"]} has posted ${row["count"]} messages! \n`

                return new discord.EmbedBuilder()
                    .setColor(config.color_hex)
                    .setTitle(`Top 10 posters in ${message.guild.name}`)
                    .setDescription(result)
                    .setFooter({ text: `Page ${pageNum}/${totalPages}` })
            })

            sendPaginatedEmbed(message, pages)
        })
    }

    percentage(message) {
        const selectSQL = `SELECT user_id, MODE() WITHIN GROUP (ORDER BY user_name) AS user_name, COUNT(*) as count,
			(SElECT COUNT(message) FROM messages WHERE  server_id = $1) as total
			FROM messages
			WHERE server_id = $1
			GROUP BY user_id
			HAVING COUNT(*) > 1
			ORDER BY COUNT(*) DESC`

        database.query(selectSQL, [message.guild.id], rows => {
            const pages = createPages(rows, 10, (pageRows, pageNum, totalPages) => {
                let result = ""
                for (const row of pageRows)
                    result += `${row["user_name"]} has posted ${Math.round((parseInt(row["count"]) / parseInt(row["total"])) * 100)}% of all messages! \n`

                return new discord.EmbedBuilder()
                    .setColor(config.color_hex)
                    .setTitle(`Top 10 posters in ${message.guild.name}`)
                    .setDescription(result)
                    .setFooter({ text: `Page ${pageNum}/${totalPages}` })
            })

            sendPaginatedEmbed(message, pages)
        })
    }
}