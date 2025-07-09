const bot = require("../../systems/bot")
const logger = require("../../systems/logger")

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