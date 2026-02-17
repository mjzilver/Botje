const discord = require("discord.js")

const Lister = require("./lister.js")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { sendPaginatedEmbed, createPages } = require("../../systems/pagination")
const { config } = require("../../systems/settings")
const { removeQuotes } = require("../../systems/stringHelpers")

module.exports = {
    "name": "phrase",
    "description": "shows how many times a word/phrase has been used in the server",
    "format": "phrase hello | phrase \"hello world\" | phrase @user hello | phrase top hello | phrase percent hello",
    "aliases": "word",
    "subcommands": [
        { name: "total", description: "Show total usage of a phrase", options: [
            { type: "string", name: "phrase", description: "The word or phrase to search for", required: true }
        ] },
        { name: "top", description: "Show who uses a phrase the most", options: [
            { type: "string", name: "phrase", description: "The word or phrase to search for", required: true }
        ] },
        { name: "percent", description: "Show percentage breakdown of phrase usage", options: [
            { type: "string", name: "phrase", description: "The word or phrase to search for", required: true }
        ] },
        { name: "user", description: "Show phrase usage for a specific user", options: [
            { type: "user", name: "user", description: "The user to check", required: true },
            { type: "string", name: "phrase", description: "The word or phrase to search for", required: true }
        ] }
    ],
    "function": message => {
        new PhraseLister().process(message)
    }
}

class PhraseLister extends Lister {
    constructor() {
        super()
    }

    process(message) {
        const { mention, leaderboard, percent, args } = this.parseArgs(message, { preserveQuotes: true })

        const word = args[0] ? removeQuotes(args[0]).toLowerCase() : undefined

        if (!word)
            return bot.messageHandler.send(message, phraseHelperMessage)

        if (mention)
            this.mention(message, mention, word)
        else if (leaderboard)
            this.perPerson(message, word)
        else if (percent)
            this.percentage(message, word)
        else
            this.total(message, word)
    }

    async perPerson(message, word) {
        const selectSQL = `SELECT user_id, server_id, count(message) as count
            FROM messages
            WHERE LOWER(message) LIKE $1 AND server_id = $2
            GROUP BY user_id, server_id
            HAVING count(message) > 1
            ORDER BY count(message) DESC`

        const rows = await database.query(selectSQL, [`%${word}%`, message.guild.id])
        if (!rows || rows.length === 0)
            return bot.messageHandler.send(message, `Nothing found for ${word} in ${message.guild.name}`)

        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows) {
                const userName = await bot.userHandler.getDisplayName(row["user_id"], row["server_id"])
                result += `\`${userName}\` has said ${word} ${row["count"]} times! \n`
            }

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top users for "${word}" in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    async total(message, word) {
        const selectSQL = `SELECT COUNT(*) as count
            FROM messages
            WHERE LOWER(message) LIKE $1 AND server_id = $2 `

        const rows = await database.query(selectSQL, [`%${word}%`, message.guild.id])
        bot.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages in this server that contain ${word}`)
    }

    async mention(message, mentioned, word) {
        const selectSQL = `SELECT COUNT(*) as count
            FROM messages
            WHERE LOWER(message) LIKE $1 
            AND server_id = $2 AND user_id = $3 `

        const rows = await database.query(selectSQL, [`%${word}%`, message.guild.id, mentioned.id])
        const userName = await bot.userHandler.getDisplayName(mentioned.id, message.guild.id)
        bot.messageHandler.send(message, `Ive found ${rows[0]["count"]} messages from \`${userName}\` in this server that contain ${word}`)
    }

    async percentage(message, word) {
        const selectSQL = `SELECT user_id, server_id, count(message) as count,
                (SElECT COUNT(m2.message) 
                FROM messages AS m2
                WHERE m2.user_id = messages.user_id
                AND m2.server_id = messages.server_id) as total
            FROM messages
            WHERE LOWER(message) LIKE $1
            AND server_id = $2
            GROUP BY messages.user_id, messages.server_id
            HAVING count(message) > 1
            ORDER BY count(message) DESC`

        const rows = await database.query(selectSQL, [`%${word}%`, message.guild.id])
        if (!rows || rows.length === 0)
            return bot.messageHandler.send(message, `Nothing found for ${word} in ${message.guild.name}`)

        // Sort by percentage
        const sortedRows = rows.map(async row => ({
            userName: await bot.userHandler.getDisplayName(row["user_id"], row["server_id"]),
            percentage: ((parseInt(row["count"]) / parseInt(row["total"])) * 100).toFixed(3)
        })).sort((a, b) => b.percentage - a.percentage)

        const pages = await createPages(sortedRows, 10, (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows)
                result += `\`${row.userName}\` has said ${word} in ${row.percentage}% of their messages! \n`

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top users by percentage for "${word}" in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }
}

const phraseHelperMessage = `Please specify a word or phrase to search for!

**Usage:**
• \`phrase hello\` - count total uses in server
• \`phrase "hello world"\` - search multi-word phrases (use quotes)
• \`phrase @user hello\` - count uses by specific user
• \`phrase top hello\` - leaderboard of who says it most
• \`phrase percent hello\` - percentage of each user's messages containing it`