const discord = require("discord.js")

const Lister = require("./lister.js")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { config } = require("../../systems/settings")
const { sendPaginatedEmbed, createPages } = require("../../systems/pagination")

module.exports = {
    "name": "said",
    "description": "shows the most repeated phrases in the server",
    "alias": "aliases",
    "format": "said | said @user",
    "subcommands": [
        { name: "total", description: "Show most repeated phrases in server" },
        { name: "user", description: "Show most repeated phrases for a specific user", options: [
            { type: "user", name: "user", description: "The user to check", required: true }
        ] }
    ],
    "function": message => {
        new SaidLister().process(message)
    }
}

class SaidLister extends Lister {
    constructor() {
        super()
    }

    async total(message) {
        return this.perPerson(message)
    }

    async perPerson(message) {
        const selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE message NOT LIKE '%<%' AND server_id = $1
            GROUP BY LOWER(message)
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC
            LIMIT 100`

        const rows = await database.query(selectSQL, [message.guild.id])
        if (!rows || rows.length === 0)
            return bot.messageHandler.send(message, `No repeated phrases found in ${message.guild.name}`)

        const pages = await createPages(rows, 10, async (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows)
                result += `${row["message"]} was said ${row["count"]} times \n`

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top most used phrases in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    async mention(message, mentioned) {
        const selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE message NOT LIKE '%<%' AND message NOT LIKE '%:%' 
            AND server_id = $1 AND user_id = $2
            GROUP BY LOWER(message)
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC 
            LIMIT 10`

        const rows = await database.query(selectSQL, [message.guild.id, mentioned.id])
        let result = ""
        for (let i = 0;
            (i < rows.length && i <= 10); i++)
            result += `${rows[i]["message"]} was said ${rows[i]["count"]} times \n`

        const userName = await bot.userHandler.getDisplayName(mentioned.id, message.guild.id)
        const top = new discord.EmbedBuilder()
            .setColor(config.color_hex)
            .setTitle(`Top 10 most used phrases in ${message.guild.name} by \`${userName}\``)
            .setDescription(result)

        bot.messageHandler.send(message, {
            embeds: [top]
        })
    }
}
