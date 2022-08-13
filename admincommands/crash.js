module.exports = async function crash(message) {
    logger.warn(`Intentionally crashing bot`)
    bot.message.reply(message, `Crashing bot...`)
    setTimeout(() => {
        bot.message = null
        bot.message.reply(message, `Bot has crashed...`)
    }, 2000)
}