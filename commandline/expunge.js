module.exports = function nukeguild(input) {
    for (const [channelID, channel] of bot.bot.channels.cache.entries()) 
        if (channel.type == "text")
            nukechannel([channelID])
}

function nukechannel(input) {
    let channels = bot.bot.channels.cache;

    var channelId = input.shift()
    var channel = channels.find(c => c.id === channelId)

    if (channel && channel.type == "text" && channel.guild.id == "445564853399191562") 
        nukemessages(channel, channel.lastMessageID)
    else
        console.log('Channel not found')
}

function nukemessages(channel, messageid, loop = 0) {
    var itemsProcessed = 0;

    channel.messages.fetch({
        limit: 100,
        before: messageid
    }).then(messages => messages.array().forEach(
        (message) => {
            itemsProcessed++;

            if (message.createdAt.getTime() < new Date(2021, 01, 01))
                message.delete({ timeout: 10 })

            if (itemsProcessed === messages.array().length) {
                if (itemsProcessed == 100) {
                    logger.log('debug', `100 messages scanned to nuke continuing - total ${((loop * 100) + itemsProcessed)} messages from ${channel.name} in ${channel.guild.name}`)
                    nukemessages(channel, message.id, ++loop);
                } else 
                    logger.log('info', `End reached ${((loop * 100) + itemsProcessed)} messages scanned to nuke from ${channel.name} in ${channel.guild.name}`)
            }
        }
    ));
}