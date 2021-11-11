module.exports = {
    'name': 'save',
    'description': 'lists all commands currently available',
    'format': 'save [channelid] [amount]?',
    'function': function save(input) {
        let channels = bot.client.channels.cache

        var channelId = input[0]
        var amount = (input[1].length !== 0 ? input[1] : 1000000) // if no set amount 1 million is set as the max OR the end is reached
        var channel = channels.find(c => c.id === channelId)

        if (channel && channel.type == "GUILD_TEXT")
            catalog(channel, channel.lastMessageId, amount)
        else
            logger.console('Channel not found')
    }
}

function catalog(channel, messageid, amount, loop = 0) {
    var itemsProcessed = 0

    channel.messages.fetch({
        limit: (amount - itemsProcessed < 100 ? amount - itemsProcessed : 100),
        before: messageid
    }).then(messages => messages.forEach(
        (message) => {
            itemsProcessed++
            database.storemessage(message)
            
            if (itemsProcessed === messages.size) {
                if (itemsProcessed == 100) {
                    if ((amount - ((loop * 100) + itemsProcessed)) > 0) {
                        logger.console(`100 messages scanned continuing - total ${((loop * 100) + itemsProcessed)} messages from ${channel.name} in ${channel.guild.name}`)
                        catalog(channel, message.id, amount, ++loop)
                    } else
                        logger.console(`Set amount reached ${((loop * 100) + itemsProcessed)} messages catalogged from ${channel.name} in ${channel.guild.name}`)
                } else
                    logger.console(`End reached ${((loop * 100) + itemsProcessed)} messages catalogged from ${channel.name} in ${channel.guild.name}`)
            }
        }
    ))
}