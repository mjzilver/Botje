module.exports = {
    'name': 'exit',
    'description': 'forcefully shuts down the bot',
    'format': 'exit',
    'function': function shutdown(input) {
        logger.warn(` --- Shutting down the bot --- `)

        bot.client.destroy()
        process.exit()
    }
}