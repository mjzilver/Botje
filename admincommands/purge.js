module.exports = async function purge(message) {
    message.channel.fetchMessages()
    .then(messages => messages.array().forEach(
        (message) => {
            if (message.author.equals(bot.user) || message.content.match(new RegExp(config.prefix, "i"))) {
                logger.log('warn', 'Purging message: ' + message.content);
                message.delete()
            }
        }
    ));
}