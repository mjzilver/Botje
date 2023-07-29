const bot = require("systems/bot.js")

module.exports = {
    "name": "ping",
    "description": "prints the current reaction speed of bot in milliseconds",
    "format": "ping",
    "function": async function ping(message) {
        bot.message.send(message, "Ping?").then((m) => {
            m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms.`)
        })
    }
}