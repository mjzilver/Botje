const discord = require("discord.js")

const Lister = require("./lister.js")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { newPaginatedEmbed, createPages } = require("../../systems/pagination")
const { config } = require("../../systems/settings")

module.exports = {
    "name": "emotes",
    "description": "shows top emotes in server, by user, or user leaderboard",
    "format": "emotes | emotes @user | emotes top",
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
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC 
            LIMIT 10`

        database.query(selectSQL, [message.guild.id], rows => {
            let result = ""
            for (let i = 0; i < rows.length; i++)
                result += `${rows[i]["message"]} was used ${rows[i]["count"]} times! \n`

            const top = new discord.EmbedBuilder()
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

            const top = new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top 10 most used emotes in ${message.guild.name} used by ${mentioned.username}`)
                .setDescription(result)

            bot.messageHandler.send(message, { embeds: [top] })
        })
    }

    perPerson(message) {
        const selectSQL = `SELECT user_id, MODE() WITHIN GROUP (ORDER BY user_name) AS user_name, COUNT(*) as count
            FROM messages
            WHERE (message LIKE '%<%') AND message NOT LIKE '%@%'
            AND server_id = $1
            GROUP BY user_id
            HAVING COUNT(*) > 1
            ORDER BY COUNT(*) DESC`

        database.query(selectSQL, [message.guild.id], rows => {
            const pages = createPages(rows, 10, (pageRows, pageNum, totalPages) => {
                let result = ""
                for (const row of pageRows)
                    result += `${row["user_name"]} has posted ${row["count"]} emotes! \n`

                return new discord.EmbedBuilder()
                    .setColor(config.color_hex)
                    .setTitle(`Top 10 posters in ${message.guild.name}`)
                    .setDescription(result)
                    .setFooter({ text: `Page ${pageNum}/${totalPages}` })
            })

            newPaginatedEmbed(message, pages)
        })
    }

    percentage(message) {
        bot.messageHandler.reply(message, "This command does not work with %")
    }
}