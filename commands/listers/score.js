let letter_values = require("json/letter_values.json")
let discord = require("discord.js")
let config = require("config.json")
let database = require("systems/database.js")
const Lister = require("./lister.js")
let bot = require("systems/bot.js")

module.exports = {
    "name": "score",
    "description": "shows the top scoring posters in the channel or mentioned user",
    "format": "score (@user)",
    "function": (message) => {
        new ScoreLister().process(message)
    }
}

class ScoreLister extends Lister {
    constructor() {
        super()
    }

    mention(message, mentioned) {
        let selectSQL = `SELECT user_id, user_name, message
        FROM messages 
        WHERE server_id = $1 AND user_id = $2 `

        let userdata = {
            "points": 0,
            "total": 0,
            "quality": 0,
            "score": 0
        }

        database.query(selectSQL, [message.guild.id, mentioned.id], (rows) => {
            for (let i = 0; i < rows.length; i++) {
                userdata["points"] += this.calculateScore(rows[i]["message"])
                userdata["total"] += rows[i]["message"].length
            }

            userdata["quality"] = ((userdata["points"] / userdata["total"]) / 2)
            userdata["score"] = Math.round(userdata["total"] * userdata["quality"])

            bot.message.send(message, `${mentioned.username}'s post score is ${userdata["score"]}`)
        })
    }

    perPerson(message) {
        let selectSQL = `SELECT user_id, user_name, message
        FROM messages 
        WHERE server_id = $1
        ORDER BY user_id`

        let userdata = {}

        database.query(selectSQL, [message.guild.id], (rows) => {
            for (let i = 0; i < rows.length; i++) {
                let user_name = rows[i]["user_name"]

                if (!userdata[user_name])
                    userdata[user_name] = {
                        "points": 0,
                        "total": 0,
                        "quality": 0,
                        "score": 0
                    }

                userdata[user_name]["points"] += this.calculateScore(rows[i]["message"])
                userdata[user_name]["total"] += rows[i]["message"].length
            }

            let sorted = []
            for (let user in userdata) {
                // magical calculation
                userdata[user]["quality"] = (userdata[user]["points"] / userdata[user]["total"]) / 2
                userdata[user]["score"] = Math.round(userdata[user]["total"] * userdata[user]["quality"])

                sorted.push([user, userdata[user]["score"]])
            }

            sorted.sort(function (a, b) {
                return b[1] - a[1]
            })

            let result = ""
            for (let i = 0; (i < sorted.length && i <= 10); i++)
                result += `${sorted[i][0]}'s post score is ${sorted[i][1]} \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 posters in ${message.guild.name}`)
                .setDescription(result)

            bot.message.send(message, {
                embeds: [top]
            })
        })
    }

    calculateScore(message) {
        let score = 0
        for (let i = 0; i < message.length; i++) {
            score += letter_values[message.charAt(i)] === undefined ? 0 : letter_values[message.charAt(i)]
        }
        return score
    }
}
