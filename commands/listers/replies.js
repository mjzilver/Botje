const discord = require("discord.js")

const Lister = require("./lister.js")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { sendPaginatedEmbed, createPages } = require("../../systems/pagination")
const { config } = require("../../systems/settings")

module.exports = {
    "name": "replies",
    "description": "shows reply relationships (who replies to whom and how often)",
    "format": "replies | replies @user | replies top",
    "subcommands": [
        { name: "total", description: "Show top reply relationships" },
        { name: "top", description: "Show top reply relationships" },
        { name: "user", description: "Show top people a user replies to", options: [
            { type: "user", name: "user", description: "The user to check", required: true }
        ] }
    ],
    "function": message => {
        new RepliesLister().process(message)
    }
}

class RepliesLister extends Lister {
    constructor() {
        super()
    }

    async total(message) {
        const selectSQL = `SELECT m.user_id as from_user, t.user_id as to_user, COUNT(*) as count
            FROM messages m
            JOIN messages t ON m.reply_to = t.id
            WHERE m.server_id = $1
            GROUP BY m.user_id, t.user_id
            HAVING COUNT(*) > 0
            ORDER BY COUNT(*) DESC`

        const rows = await database.query(selectSQL, [message.guild.id])
        if (!rows || rows.length === 0)
            return bot.messageHandler.send(message, `No reply relationships found in ${message.guild.name}`)

        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows) {
                const fromName = await bot.userHandler.getDisplayName(row["from_user"], message.guild.id)
                const toName = await bot.userHandler.getDisplayName(row["to_user"], message.guild.id)
                result += `\`${fromName}\` sent ${row["count"]} replies to \`${toName}\`\n`
            }

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top reply relationships in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    async mention(message, mentioned) {
        const selectSQL = `SELECT t.user_id as to_user, COUNT(*) as count
            FROM messages m
            JOIN messages t ON m.reply_to = t.id
            WHERE m.server_id = $1 AND m.user_id = $2
            GROUP BY t.user_id
            HAVING COUNT(*) > 0
            ORDER BY COUNT(*) DESC
            LIMIT 10`

        const rows = await database.query(selectSQL, [message.guild.id, mentioned.id])
        if (!rows || rows.length === 0) {
            const fromName = await bot.userHandler.getDisplayName(mentioned.id, message.guild.id)
            return bot.messageHandler.send(message, `No replies found for ${fromName}`)
        }

        const fromName = await bot.userHandler.getDisplayName(mentioned.id, message.guild.id)

        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows) {
                const toName = await bot.userHandler.getDisplayName(row["to_user"], message.guild.id)
                result += `\`${fromName}\` sent ${row["count"]} replies to \`${toName}\`\n`
            }

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Who ${fromName} replies to most in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    async perPerson(message) {
        const selectSQL = `SELECT user_id, server_id, COUNT(*) as count
            FROM messages
            WHERE server_id = $1 AND reply_to IS NOT NULL
            GROUP BY user_id, server_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`

        const rows = await database.query(selectSQL, [message.guild.id])
        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows) {
                const userName = await bot.userHandler.getDisplayName(row["user_id"], row["server_id"])
                result += `\`${userName}\` has sent ${row["count"]} replies! \n`
            }

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top repliers in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    percentage(message) {
        bot.messageHandler.reply(message, "This command does not work with %")
    }
}
