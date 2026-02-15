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

    async total(message) {
        const selectSQL = "SELECT COUNT(*) as count FROM messages WHERE server_id = $1"
        const rows = await database.query(selectSQL, [message.guild.id])
        bot.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages in ${message.guild.name}`)
    }

    async mention(message, mentioned) {
        const selectSQL = "SELECT COUNT(*) as count FROM messages WHERE server_id = $1 AND user_id = $2"
        const rows = await database.query(selectSQL, [message.guild.id, mentioned.id])
        const userName = await bot.userHandler.getDisplayName(mentioned.id, message.guild.id)
        bot.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages by \`${userName}\` in this server`)
    }

    async perPerson(message) {
        const selectSQL = `SELECT user_id, server_id, COUNT(*) as count
            FROM messages
            WHERE server_id = $1
            GROUP BY user_id, server_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC `
        const rows = await database.query(selectSQL, [message.guild.id])
        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows) {
                const userName = await bot.userHandler.getDisplayName(row["user_id"], row["server_id"])
                result += `\`${userName}\` has posted ${row["count"]} messages! \n`
            }

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top 10 posters in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    async percentage(message) {
        const selectSQL = `SELECT user_id, server_id, COUNT(*) as count,
			(SElECT COUNT(message) FROM messages WHERE server_id = $1) as total
			FROM messages
			WHERE server_id = $1
			GROUP BY user_id, server_id
			HAVING COUNT(*) > 1
			ORDER BY COUNT(*) DESC`
        const rows = await database.query(selectSQL, [message.guild.id])
        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows) {
                const userName = await bot.userHandler.getDisplayName(row["user_id"], row["server_id"])
                result += `\`${userName}\` has posted ${Math.round((parseInt(row["count"]) / parseInt(row["total"])) * 100)}% of all messages! \n`
            }

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top 10 posters in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }
}