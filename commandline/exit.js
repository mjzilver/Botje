let bot = require("systems/bot.js")
let logger = require("systems/logger.js")

module.exports = {
    "name": "exit",
    "description": "forcefully shuts down the bot",
    "format": "exit",
    "function": function shutdown() {
        logger.warn(" --- Shutting down the bot --- ")

        bot.client.destroy()
        process.exit()
    }
}