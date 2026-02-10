const discord = require("discord.js")

const Lister = require("./lister.js")
const letterValues = require("../../json/letter_values.json")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { sendPaginatedEmbed, createPages } = require("../../systems/pagination")
const { config } = require("../../systems/settings")

module.exports = {
    "name": "quality",
    "description": "shows post quality (uniqueness)",
    "format": "quality @user | quality top",
    "subcommands": [
        { name: "top", description: "Show users with highest quality posts" },
        { name: "user", description: "Show quality for a specific user", options: [
            { type: "user", name: "user", description: "The user to check", required: true }
        ] }
    ],
    "function": message => {
        new QualityLister().process(message)
    }
}

class QualityLister extends Lister {
    constructor() {
        super()
    }

    mention(message, mentioned) {
        const selectSQL = `
            SELECT 
                user_id,
                (
                    SELECT user_name
                    FROM messages m2
                    WHERE m2.user_id = m.user_id
                    ORDER BY id DESC
                    LIMIT 1
                ) AS user_name,
                COUNT(*) AS total_messages,
                COUNT(DISTINCT message) AS unique_messages,
                (COUNT(DISTINCT message) * 100.0 / COUNT(*)) AS percentage_unique
            FROM 
                messages m
            WHERE
                server_id = $1
                AND user_id = $2
            GROUP BY 
                user_id
            HAVING 
                COUNT(*) > 1000
            ORDER BY 
                percentage_unique DESC, user_id;
        `

        database.query(selectSQL, [message.guild.id, mentioned.id], rows => {
            if (rows.length === 0)
                return bot.messageHandler.send(message, `${mentioned.username} does not have enough qualifying messages.`)

            const userData = rows[0]
            const userQuality = parseFloat(userData["percentage_unique"]).toFixed(2)

            bot.messageHandler.send(message, `${mentioned.username}'s post quality is ${userQuality}%`)
        })
    }

    perPerson(message) {
        const selectSQL = `SELECT 
            user_id,
            (
                SELECT user_name
                FROM messages m2
                WHERE m2.user_id = m.user_id
                ORDER BY id DESC
                LIMIT 1
            ) AS user_name,
            COUNT(*) AS total_messages,
            COUNT(DISTINCT message) AS unique_messages,
            (COUNT(DISTINCT message) * 100.0 / COUNT(*)) AS percentage_unique
        FROM 
            messages m
        WHERE
            server_id = $1
        GROUP BY 
            user_id
        HAVING 
            COUNT(*) > 1000
        ORDER BY 
            percentage_unique DESC, user_id;`

        database.query(selectSQL, [message.guild.id], rows => {
            const pages = createPages(rows, 10, (pageRows, pageNum, totalPages) => {
                let result = ""
                for (const row of pageRows)
                    result += `${row["user_name"]}'s post quality is ${parseFloat(row["percentage_unique"]).toFixed(2)}% \n`

                return new discord.EmbedBuilder()
                    .setColor(config.color_hex)
                    .setTitle(`Top 10 quality posters in ${message.guild.name}`)
                    .setDescription(result)
                    .setFooter({ text: `Page ${pageNum}/${totalPages}` })
            })

            sendPaginatedEmbed(message, pages)
        })
    }

    calculateScore(message) {
        let score = 0
        for (let i = 0; i < message.length; i++)
            score += letterValues[message.charAt(i)] === undefined ? 0 : letterValues[message.charAt(i)]
        return score
    }
}
