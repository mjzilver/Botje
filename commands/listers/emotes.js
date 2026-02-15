const discord = require("discord.js")

const Lister = require("./lister.js")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { sendPaginatedEmbed, createPages } = require("../../systems/pagination")
const { config } = require("../../systems/settings")

module.exports = {
    "name": "emotes",
    "description": "shows top emotes in server",
    "format": "emotes | emotes @user | emotes top",
    "subcommands": [
        { name: "top", description: "Show top 10 most used emotes" },
        { name: "percent", description: "Show emote usage by person" },
        { name: "user", description: "Show top emotes for a specific user", options: [
            { type: "user", name: "user", description: "The user to check", required: true }
        ] }
    ],
    "function": message => {
        new EmotesLister().process(message)
    }
}

class EmotesLister extends Lister {
    constructor() {
        super()
    }

    async total(message) {
        const selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE (message LIKE '%<%') AND message NOT LIKE '%@%'
            AND server_id = $1
            GROUP BY LOWER(message)
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 100`

        const rows = await database.query(selectSQL, [message.guild.id])
        if (!rows || rows.length === 0)
            return bot.messageHandler.send(message, `No emotes found in ${message.guild.name}`)

        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows)
                result += `${row["message"]} was used ${row["count"]} times! \n`

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top emotes in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    async mention(message, mentioned) {
        const selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE (message LIKE '%<%') AND message NOT LIKE '%@%'
            AND server_id = $1 AND user_id = $2
            GROUP BY LOWER(message)
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 1000`

        const rows = await database.query(selectSQL, [message.guild.id, mentioned.id])
        if (!rows || rows.length === 0) {
            const userName = await bot.userHandler.getDisplayName(mentioned.id, message.guild.id)
            return bot.messageHandler.send(message, `No emotes found for ${userName}`)
        }

        const userName = await bot.userHandler.getDisplayName(mentioned.id, message.guild.id)

        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows)
                result += `${row["message"]} said ${row["count"]} times! \n`

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Emotes used by ${userName} in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    async perPerson(message) {
        const selectSQL = `SELECT user_id, server_id, COUNT(*) as count
            FROM messages
            WHERE (message LIKE '%<%') AND message NOT LIKE '%@%'
            AND server_id = $1
            GROUP BY user_id, server_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`

        const rows = await database.query(selectSQL, [message.guild.id])
        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows) {
                const userName = await bot.userHandler.getDisplayName(row["user_id"], row["server_id"])
                result += `\`${userName}\` has posted ${row["count"]} emotes! \n`
            }

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top 10 posters in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    percentage(message) {
        bot.messageHandler.reply(message, "This command does not work with %")
    }
}