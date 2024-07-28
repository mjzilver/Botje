const bot = require("systems/bot.js")
const logger = require("systems/logger.js")

process.on("exit", function() {
    logger.info("=== Bot shutting down, goodbye ===")
})

process.on("SIGINT", function() {
    logger.info("=== Bot forced to shut down, goodbye ===")
})

process.on("uncaughtException", function(error) {
    if (bot.commandHandler.commandList.get())
        bot.message.reply(bot.commandHandler.commandList.get(), "An error occured, this is probably your fault!")

    logger.error(`Uncaught error "${error.message}"\n === STACK === \n"${error.stack}"`)
})

process.on("unhandledRejection", function(error) {
    if (bot.commandHandler.commandList.get())
        bot.message.reply(bot.commandHandler.commandList.get(), "An error occured, this is probably your fault, do not @me!")
    logger.error(`Unhandled rejection "${error.message}"\n === STACK === \n"${error.stack}"`)
})
