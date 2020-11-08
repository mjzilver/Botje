var config = require('../config.json');
var logger = require('winston').loggers.get('logger');

function storemsg(message, db) {
	if (message.content.length >= 3 && !message.author.equals(bot.user) && !message.content.match(new RegExp(config.prefix, "i"))) {
		var insert = db.prepare('INSERT OR IGNORE INTO messages (user_id, user_name, message, channel, date) VALUES (?, ?, ?, ?, ?)',
			[message.author.id, message.author.username, message.content, message.channel.id, message.createdAt.getTime()]);
		insert.run(function (err) {
			if (err) {
				logger.error("failed to insert: " + message.content + ' posted by ' + message.author.username);
				logger.error(err);
			}
		});
	}
}

module.exports = function catalog(message, db, loop = 0) {
    if (loop == 0)
        message.delete()

    var itemsProcessed = 0;

    message.channel.fetchMessages({
            limit: 100,
            before: message.id
        })
    .then(messages => messages.array().forEach(
        (message) => {
            itemsProcessed++;

            if (!message.author.equals(bot.user) && !message.content.match(new RegExp(config.prefix, "i"))) {
                storemsg(message, db);
            }

            if (itemsProcessed === messages.array().length) {
                if (itemsProcessed == 100) {
                    logger.log('debug', "100 messages scanned - total ~" + loop * 100 + " messages")
                    catalog(message, db, ++loop);
                } else {
                    logger.log('debug', "End reached ~" + ((loop * 100) + itemsProcessed) + " messages catalogged")
                }
            }
        }
    ));
}