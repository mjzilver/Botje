module.exports = function save(input) {
    let channels = bot.bot.channels;

    var channelId = input.shift()
    var channel = channels.find(c => c.id === channelId)

    if(channel && channel.type == "text") {
        catalog(channel, channel.lastMessageID)
    } else
        console.log('Channel not found')
}

function catalog(channel, messageid, loop = 0) {
    var itemsProcessed = 0;

    channel.fetchMessages({
            limit: 100,
            before: messageid
        })
    .then(messages => messages.array().forEach(
        (message) => {
            itemsProcessed++;

            if (!message.author.equals(bot.user) && !message.content.match(new RegExp(config.prefix, "i")) && message.content.length >= 3) {
                var insert = database.db.prepare('INSERT OR IGNORE INTO messages (user_id, user_name, message, channel, date) VALUES (?, ?, ?, ?, ?)',
                    [message.author.id, message.author.username, message.cleanContent, message.channel.id, message.createdAt.getTime()]);
                insert.run(function (err) {
                    if (err) {
                        logger.error("failed to insert: " + message.content + ' posted by ' + message.author.username);
                        logger.error(err);
                    }
                });
            }

            if (itemsProcessed === messages.array().length) {
                if (itemsProcessed == 100) {
                    logger.log('debug', "100 messages scanned - total ~" + loop * 100 + " messages")
                    catalog(channel, message.id, ++loop);
                } else {
                    logger.log('debug', "End reached ~" + ((loop * 100) + itemsProcessed) + " messages catalogged")
                }
            }
        }
    ));
}