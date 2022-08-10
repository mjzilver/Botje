class EventListener {
    constructor(bot) {
        bot.client.on('shardError', function (error) {
            logger.error(`Shard error: ${error.message}`)
        })

        bot.client.on('error', function (error) {
            logger.error(`Client error: ${error.message}`)
        })

        bot.client.on('messageCreate', message => {
            database.storeMessage(message)
            bot.command.handleCommand(message)
        })

        bot.client.on('messageDelete', message => {
            logger.deletion(`This Message has been deleted: ${message.author.username}: ${message.content} == Posted in channel '${message.channel.name}' in server '${message.channel.guild.name} == Send at: ${new Date(message.createdTimestamp).toUTCString()}`)
        })

        bot.client.on('emojiCreate', emoji => {
            backup.saveEmoji(emoji)
        })

        bot.client.on('emojiDelete', emoji => {
            backup.saveEmoji(emoji, "_deleted")
        })

        bot.client.on('emojiUpdate', (oldEmoji, newEmoji) => {
            backup.saveEmoji(oldEmoji, "_old")
            backup.saveEmoji(newEmoji)
        })
    }
}

module.exports = (bot) => new EventListener(bot)