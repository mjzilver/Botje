const bot = require("../systems/bot")

module.exports = {
    "name": "ping",
    "description": "prints the current reaction speed of bot in milliseconds",
    "format": "ping",
    "function": async function ping(message) {
        bot.messageHandler.send(message, "Ping?").then(m => {
            bot.messageHandler.edit(m, `Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms.`)
        })
    }
}