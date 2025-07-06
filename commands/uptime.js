const bot = require("systems/bot.js")
const { formatUptime } = require("systems/utils.js")

module.exports = {
    "name": "uptime",
    "description": "show how long bot has been online in this session",
    "format": "uptime",
    "function": function uptime(message) {
        const now = new Date()
        const diff = now - bot.client.readyTimestamp
        const formattedUptime = formatUptime(diff)

        bot.messageHandler.send(message, `I have been online for **${formattedUptime}** since my last restart.`)
    }
}
