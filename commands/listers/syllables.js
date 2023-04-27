let discord = require("discord.js")
let config = require("config.json")
let database = require("systems/database.js")
const Lister = require("./lister.js")
let bot = require("systems/bot.js")

module.exports = {
    "name": "syllables",
    "description": "shows the top 10 users with the most syllables",
    "format": "syllables (@user)",
    "function": (message) => {
        new syllableLister().process(message)
    }
}

class syllableLister extends Lister {
    constructor() {
        super()
    }

    mention(message, mentioned) {
        let selectSQL = `SELECT user_id, user_name, message
        FROM messages 
        WHERE server_id = $1 AND user_id = $2 `

        let userdata = {
            "syllables": 0,
            "total": 0,
            "average": 0
        }

        database.query(selectSQL, [message.guild.id, mentioned.id], (rows) => {
            for (let i = 0; i < rows.length; i++) {
                let syllables = this.calculateSyllables(rows[i]["message"])
                if (syllables >= 1) {
                    userdata["syllables"] += syllables
                    userdata["total"] += 1
                }
            }

            userdata["average"] = Math.round(userdata["syllables"] / userdata["total"])
            bot.message.send(message, `${mentioned.username} has an average of ${userdata["average"]} syllables per post`)
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
                        "syllables": 0,
                        "total": 0,
                        "average": 0
                    }

                let syllables = this.calculateSyllables(rows[i]["message"])
                if (syllables >= 1) {
                    userdata[user_name]["syllables"] += syllables
                    userdata[user_name]["total"] += 1
                }
            }

            let sorted = []
            for (let user in userdata) {
                // magical calculation
                userdata[user]["average"] = Math.round(userdata[user]["syllables"] / userdata[user]["total"])
                sorted.push([user, userdata[user]["average"]])
            }

            sorted.sort(function (a, b) { return b[1] - a[1] })

            let result = ""
            for (let i = 0; (i < sorted.length && i <= 10); i++)
                result += `${sorted[i][0]} has an average of ${sorted[i][1]} syllables per post \n`

            const top = new discord.MessageEmbed()
                .setColor(config.color_hex)
                .setTitle(`Top 10 most intellectual posters in ${message.guild.name}`)
                .setDescription(result)

            bot.message.send(message, {
                embeds: [top]
            })
        })
    }

    calculateSyllables(message) {
        message = message.replace(/e /i)
        message = message.replace(/ y/i)
        let score = message.match(/(?:[aeiouy]{1,2})/gi)
        return score ? score.length : 0
    }
}