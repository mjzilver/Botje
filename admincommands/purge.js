var config = require('../config.json');
var logger = require('winston').loggers.get('logger');

module.exports = async function purge(message, db) {
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