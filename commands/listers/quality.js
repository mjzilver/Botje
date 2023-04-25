let letter_values = require("json/letter_values.json")
let discord = require("discord.js")
let config = require("config.json")
let database = require("systems/database.js")
const Lister = require("./lister.js")
let bot = require("systems/bot.js")

module.exports = {
    "name": "quality",
    "description": "shows the top 10 quality posers in the current channel or mentioned user",
    "format": "quality (@user)",
    "function": (message) => {
        new QualityLister().process(message)
    }
}

class QualityLister extends Lister {
    constructor() {
        super()
    }

    mention(message, mentioned) {
        let selectSQL = `SELECT user_id, user_name, message 
        FROM messages 
        WHERE server = ${message.guild.id} AND user_id = ${mentioned.id} `

        let userdata = {
            "points": 0,
            "total": 0,
            "quality": 0
        }

        database.query(selectSQL, [], (rows) => {
            for (let i = 0; i < rows.length; i++) {
                userdata["points"] += this.calculateScore(rows[i]["message"])
                userdata["total"] += rows[i]["message"].length
            }

            userdata["quality"] = Math.round(((userdata["points"] / userdata["total"]) * 100) / 2)

            bot.message.send(message, `${mentioned.username}'s post quality is ${userdata["quality"]}%`)
        })
    }

    perPerson(message, page = 0) {
        let selectSQL = `SELECT user_id, user_name, message
        FROM messages 
        WHERE server = ?
        ORDER BY user_id`

        let userdata = {}

        database.query(selectSQL, [message.guild.id], (rows) => {
            for (let i = 0; i < rows.length; i++) {
                let user_name = rows[i]["user_name"]

                if (!userdata[user_name]) {
                    userdata[user_name] = {
                        "points": 0,
                        "total": 0,
                        "quality": 0
                    }
                }

                userdata[user_name]["points"] += this.calculateScore(rows[i]["message"])
                userdata[user_name]["total"] += rows[i]["message"].length
            }

            let sorted = []
            for (let user in userdata) {
                // magical calculation
                userdata[user]["quality"] = Math.round(((userdata[user]["points"] / userdata[user]["total"]) * 100) / 2)
                sorted.push([user, userdata[user]["quality"]])
            }

            sorted.sort(function (a, b) {
                return b[1] - a[1]
            })

            if (page > Math.ceil(sorted.length / 10))
                return bot.message.send(message, `Page ${(page + 1)} of ${Math.ceil(sorted.length / 10)} not found`)

            let result = ""
            for (let i = page * 10; i < sorted.length && i <= (page * 10) + 9; i++)
                result += `${sorted[i][0]}'s post quality is ${sorted[i][1]}% \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 quality posters in ${message.guild.name}`)
                .setDescription(result)
                .setFooter(`Page ${(page + 1)} of ${Math.ceil(sorted.length / 10)}`)

            bot.message.send(message, {
                embeds: [top]
            })
        })
    }


    calculateScore(message) {
        let score = 0
        for (let i = 0; i < message.length; i++)
            score += letter_values[message.charAt(i)] === undefined ? 0 : letter_values[message.charAt(i)]
        return score
    }
}
