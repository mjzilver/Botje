module.exports = function shutdown(input) {
    logger.log('warn', ` --- Shutting down the bot --- `)

    bot.bot.destroy()
    process.exit()
}