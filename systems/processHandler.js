const bot = require("./bot")
const logger = require("./logger")

process.on("uncaughtException", error => {
    if (bot.commandHandler.commandList.get())
        bot.messageHandler.reply(bot.commandHandler.commandList.get(), "An error occured, this is probably your fault!")

    logger.error(`Uncaught error "${error.message}"\n === STACK === \n"${error.stack}"`)
})

process.on("unhandledRejection", error => {
    if (bot.commandHandler.commandList.get())
        bot.messageHandler.reply(bot.commandHandler.commandList.get(), "An error occured, this is probably your fault, do not @me!")
    logger.error(`Unhandled rejection "${error.message}"\n === STACK === \n"${error.stack}"`)
})
