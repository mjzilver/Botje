let bot = require("systems/bot.js")

module.exports = {
    "name": "uptime",
    "description": "show how long bot has been online in this session",
    "format": "uptime",
    "function": function uptime(message) {
        const now = new Date()
        const diff = now - bot.client.readyTimestamp
        const days = Math.floor(diff / 86400000)
        const hours = Math.floor((diff / 3600000) % 24)
        const minutes = Math.floor((diff / 60000) % 60)
        const seconds = Math.floor((diff / 1000) % 60)

        bot.message.send(message, `I have been online for ${days ? `${days} days, ` : ""}${hours ? `${hours} hours, ` : ""}${minutes} minutes and ${seconds} seconds`)
    }
}
