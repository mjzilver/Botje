const discord = require("discord.js")

const Lister = require("./lister.js")
const bot = require("../../systems/bot")
const database = require("../../systems/database")
const { sendPaginatedEmbed, createPages } = require("../../systems/pagination")
const { config } = require("../../systems/settings")

module.exports = {
    "name": "syllables",
    "description": "shows the top users with the most syllables in their posts",
    "format": "syllables (@user)",
    "subcommands": [
        { name: "top", description: "Show top users by syllable count" },
        { name: "user", description: "Show syllable stats for a specific user", options: [
            { type: "user", name: "user", description: "The user to check", required: true }
        ] }
    ],
    "function": message => {
        new syllableLister().process(message)
    }
}

class syllableLister extends Lister {
    constructor() {
        super()
    }

    async mention(message, mentioned) {
        const selectSQL = `SELECT user_id, message
            FROM messages 
            WHERE server_id = $1 AND user_id = $2 `

        const userdata = {
            "syllables": 0,
            "total": 0,
            "average": 0
        }

        const rows = await database.query(selectSQL, [message.guild.id, mentioned.id])
        for (let i = 0; i < rows.length; i++) {
            const syllables = this.calculateSyllables(rows[i]["message"])
            if (syllables >= 1) {
                userdata["syllables"] += syllables
                userdata["total"] += 1
            }
        }

        userdata["average"] = Math.round(userdata["syllables"] / userdata["total"])
        const userName = await bot.userHandler.getDisplayName(mentioned.id, message.guild.id)
        bot.messageHandler.send(message, `\`${userName}\` has an average of ${userdata["average"]} syllables per post`)
    }

    async perPerson(message) {
        const selectSQL = `SELECT user_id, message
            FROM messages 
            WHERE server_id = $1`

        const userdata = {}

        const rows = await database.query(selectSQL, [message.guild.id])
        for (let i = 0; i < rows.length; i++) {
            const userId = rows[i]["user_id"]

            if (!userdata[userId])
                userdata[userId] = {
                    "syllables": 0,
                    "total": 0,
                    "average": 0
                }

            const syllables = this.calculateSyllables(rows[i]["message"])
            if (syllables >= 1) {
                userdata[userId]["syllables"] += syllables
                userdata[userId]["total"] += 1
            }
        }

        const sorted = []
        for (const userId in userdata) {
            // magical calculation
            userdata[userId]["average"] = Math.round(userdata[userId]["syllables"] / userdata[userId]["total"])
            sorted.push([userId, userdata[userId]["average"]])
        }

        sorted.sort((a, b) => {
            return b[1] - a[1]
        })

        const userNames = {}
        for (const [userId] of sorted)
            userNames[userId] = await bot.userHandler.getDisplayName(userId, message.guild.id)

        const pages = await createPages(sorted, 10, (pageRows, pageNum, totalPages) => {
            let result = ""
            for (const row of pageRows)
                result += `\`${userNames[row[0]]}\` has an average of ${row[1]} syllables per post \n`

            return new discord.EmbedBuilder()
                .setColor(config.color_hex)
                .setTitle(`Top most intellectual posters in ${message.guild.name}`)
                .setDescription(result)
                .setFooter({ text: `Page ${pageNum}/${totalPages}` })
        })

        sendPaginatedEmbed(message, pages)
    }

    calculateSyllables(message) {
        message = message.replace(/e /i)
        message = message.replace(/ y/i)
        const score = message.match(/(?:[aeiouy]{1,2})/gi)
        return score ? score.length : 0
    }
}