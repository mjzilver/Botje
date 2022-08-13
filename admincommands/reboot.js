module.exports = async function reboot(message) {
    logger.warn(`Bot is getting rebooted`)

    delete global.bot
    global.bot = new require("../systems/bot")

    bot.message.markComplete(message)
}