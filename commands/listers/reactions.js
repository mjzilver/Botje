const discord = require("discord.js")

const Lister = require("./lister.js")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { sendPaginatedEmbed, createPages } = require("../../systems/pagination")
const { config } = require("../../systems/settings")

module.exports = {
    "name": "reactions",
    "description": "shows top reactions in server",
    "format": "reactions | reactions @user | reactions top",
    "subcommands": [
        { name: "total", description: "Show total usage of reactions" },
        { name: "top", description: "Show top 10 most used reactions" },
        { name: "user", description: "Show top reactions by a specific user", options: [
            { type: "user", name: "user", description: "The user to check", required: true }
        ] }
    ],
    "function": message => {
        new ReactionsLister().process(message)
    }
}

class ReactionsLister extends Lister {
    constructor() {
        super()
    }

    async total(message) {
        const selectSQL = `SELECT r.emoji as emoji, COUNT(*) as count
            FROM reactions r
            JOIN messages m ON r.message_id = m.id
            WHERE m.server_id = $1
            GROUP BY r.emoji
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 10`

        const rows = await database.query(selectSQL, [message.guild.id])
        let result = ""
        for (let i = 0; i < rows.length; i++)
            result += `${rows[i]["emoji"]} was used ${rows[i]["count"]} times! \n`

        const top = new discord.EmbedBuilder()
            .setColor(config.color_hex)
            .setTitle(`Top 10 most used reactions in ${message.guild.name}`)
            .setDescription(result)

        bot.messageHandler.send(message, { embeds: [top] })
    }

    async mention(message, mentioned) {
        const selectSQL = `SELECT r.emoji as emoji, COUNT(*) as count
            FROM reactions r
            JOIN messages m ON r.message_id = m.id
            WHERE m.server_id = $1 AND r.user_id = $2
            GROUP BY r.emoji
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 10`

        const rows = await database.query(selectSQL, [message.guild.id, mentioned.id])
        let result = ""
        for (let i = 0; i < rows.length; i++)
            result += `${rows[i]["emoji"]} was used ${rows[i]["count"]} times! \n`

        const username = await bot.userHandler.getDisplayName(mentioned.id, message.guild.id)

        const top = new discord.EmbedBuilder()
            .setColor(config.color_hex)
            .setTitle(`Top 10 most used reactions in ${message.guild.name} used by \`${username}\``)
            .setDescription(result)

        bot.messageHandler.send(message, { embeds: [top] })
    }

    async perPerson(message) {
        const selectSQL = `SELECT r.user_id, m.server_id, COUNT(*) as count
            FROM reactions r
            JOIN messages m ON r.message_id = m.id
            WHERE m.server_id = $1
            GROUP BY r.user_id, m.server_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`

        const rows = await database.query(selectSQL, [message.guild.id])
        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows) {
                const userName = await bot.userHandler.getDisplayName(row["user_id"], row["server_id"])
                result += `\`${userName}\` has reacted ${row["count"]} times! \n`
            }

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top reactors in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    percentage(message) {
        bot.messageHandler.reply(message, "This command does not work with %")
    }
}
