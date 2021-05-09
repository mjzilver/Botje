module.exports = async function purge(message) {
    message.channel.messages.fetch()
    .then(messages => messages.array().forEach(
        (message) => {
            if (message.author.id == bot.bot.user.id || message.content.match(new RegExp(config.prefix, "gi")) || message.content.match(new RegExp(/bot(je)/, "gi"))) {
                logger.log('warn', 'Purging message: ' + message.content)
                message.delete()
            }
        }
    ))
}