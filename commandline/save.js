module.exports = function save(input) {
    let channels = bot.client.channels.cache

    var channelId = input.shift()
    var amount = (input[0] ? input[0] : 1000000) // if no set amount 1 million is set as the max OR the end is reached
    var channel = channels.find(c => c.id === channelId)

    if (channel && channel.type == "text")
        catalog(channel, channel.lastMessageID, amount)
    else
        console.log('Channel not found')
}

function catalog(channel, messageid, amount, loop = 0) {
    var itemsProcessed = 0

    channel.messages.fetch({
        limit: (amount - itemsProcessed < 100 ? amount - itemsProcessed : 100),
        before: messageid
    }).then(messages => messages.array().forEach(
        (message) => {
            itemsProcessed++
            database.storemessage(message)

            if (itemsProcessed === messages.array().length) {
                if (itemsProcessed == 100) {
                    if (amount > 0) {
                        logger.log('debug', `100 messages scanned continuing - total ${((loop * 100) + itemsProcessed)} messages from ${channel.name} in ${channel.guild.name}`)
                        catalog(channel, message.id, amount, ++loop)
                    } else
                        logger.log('info', `Set amount reached ${((loop * 100) + itemsProcessed)} messages catalogged from ${channel.name} in ${channel.guild.name}`)
                } else
                    logger.log('info', `End reached ${((loop * 100) + itemsProcessed)} messages catalogged from ${channel.name} in ${channel.guild.name}`)
            }
        }
    ))
}