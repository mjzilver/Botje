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

            database.storemessage(message);

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