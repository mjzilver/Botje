const discord = require("discord.js")

const Lister = require("./lister.js")
const letterValues = require("../../json/letter_values.json")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { sendPaginatedEmbed, createPages } = require("../../systems/pagination")
const { config } = require("../../systems/settings")

module.exports = {
    "name": "score",
    "description": "shows the top scoring posters in the channel or mentioned user",
    "format": "score (@user)",
    "function": message => {
        new ScoreLister().process(message)
    }
}

class ScoreLister extends Lister {
    constructor() {
        super()
    }

    mention(message, mentioned) {
        const selectSQL = `SELECT user_id, user_name, message
            FROM messages 
            WHERE server_id = $1 AND user_id = $2 `

        const userdata = {
            "points": 0,
            "total": 0,
            "quality": 0,
            "score": 0
        }

        database.query(selectSQL, [message.guild.id, mentioned.id], rows => {
            for (let i = 0; i < rows.length; i++) {
                userdata["points"] += this.calculateScore(rows[i]["message"])
                userdata["total"] += rows[i]["message"].length
            }

            userdata["quality"] = ((userdata["points"] / userdata["total"]) / 2)
            userdata["score"] = Math.round(userdata["total"] * userdata["quality"])

            bot.messageHandler.send(message, `${mentioned.username}'s post score is ${userdata["score"]}`)
        })
    }

    perPerson(message) {
        const selectSQL = `SELECT user_id, user_name, message
            FROM messages 
            WHERE server_id = $1
            ORDER BY user_id`

        const userdata = {}

        database.query(selectSQL, [message.guild.id], rows => {
            for (let i = 0; i < rows.length; i++) {
                const userName = rows[i]["user_name"]

                if (!userdata[userName])
                    userdata[userName] = {
                        "points": 0,
                        "total": 0,
                        "quality": 0,
                        "score": 0
                    }

                userdata[userName]["points"] += this.calculateScore(rows[i]["message"])
                userdata[userName]["total"] += rows[i]["message"].length
            }

            const sorted = []
            for (const user in userdata) {
                // magical calculation
                userdata[user]["quality"] = (userdata[user]["points"] / userdata[user]["total"]) / 2
                userdata[user]["score"] = Math.round(userdata[user]["total"] * userdata[user]["quality"])

                sorted.push([user, userdata[user]["score"]])
            }

            sorted.sort((a, b) => {
                return b[1] - a[1]
            })

            const pages = createPages(sorted, 10, (pageRows, pageNum, totalPages) => {
                let result = ""
                for (const row of pageRows)
                    result += `${row[0]}'s post score is ${row[1]} \n`

                return new discord.EmbedBuilder()
                    .setColor(config.color_hex)
                    .setTitle(`Top posters by score in ${message.guild.name}`)
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
