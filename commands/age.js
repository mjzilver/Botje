const bot = require("systems/bot.js")

module.exports = {
    "name": "age",
    "description": "shows how long bot has been living in this server",
    "format": "age",
    "function": function age(message) {
        const joined = new Date(message.guild.members.cache.find(u => u.id === bot.client.user.id).joinedAt)
        const now = new Date()
        const diff = now - joined
        let days = Math.floor(diff / 86400000)
        const years = Math.floor(days / 365)
        days -= years * 365
        const hours = Math.floor((diff / 3600000) % 24)
        const birthday = `${joined.getDate()} of ${joined.toLocaleString("default", { month: "long" })}`

        bot.message.reply(message, `I have been in this server for ${years ? `${years} years, ` : ""}${days} days and ${hours} hours. My birthday is ${birthday}`)
    }
}

