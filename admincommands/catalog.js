const database = require("../database");

module.exports = function catalog(message, loop = 0) {
    if (loop == 0)
        message.delete()

    var itemsProcessed = 0;

    message.channel.messages.fetch({
        limit: 100,
        before: message.id
    }).then(messages => messages.array().forEach(
        (message) => {
            itemsProcessed++;

            database.storemessage(message);

            if (itemsProcessed === messages.array().length) {
                if (itemsProcessed == 100) {
                    logger.log('debug', `100 messages scanned - total ~ ${loop * 100} messages from ${message.channel.name} in ${message.channel.guild.name}`)
                    catalog(message, ++loop);
                } else {
                    logger.log('info', `End reached ~ ${((loop * 100) + itemsProcessed)} messages catalogged from ${message.channel.name} in ${message.channel.guild.name}`)
                }
            }
        }
    ));
}