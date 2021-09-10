module.exports = async function nuke(message) {
    if (message.author.id == message.guild.ownerID)
    {
        const filter = m => {
            return (m.content.startsWith('launch') && m.author.id == message.author.id)
        }

        message.channel.awaitMessages(filter, { max: 1, time: 60000 })
            .then(collected  => {
                message.channel.send(`Nuke launched. Blowout soon, fellow stalker.`)
                nukeguild(message)
            })  
        message.channel.send("Nuke armed to confirm launch type 'launch' to launch the nuke, this cannot be cancelled.")
    } else {
        message.channel.send("Only the server owner may send the nuke.")
    }
}

function nukeguild(message) {
    for (const [channelID, channel] of bot.client.channels.cache.entries()) 
        if (channel.type == "text" && channel.guild.id == message.guild.id)
            nukechannel(channelID)
}

function nukechannel(channelId) {
    let channels = bot.client.channels.cache
    var channel = channels.find(c => c.id === channelId)

    if (channel && channel.type == "text")  {
        nukemessages(channel, channel.lastMessageID)
        channel.lastMessage.delete({ timeout : 100 })
        logger.log('warn', `NUKING channel: ${channel.name}`)
    } else
        logger.console('Channel not found')
}

function nukemessages(channel, messageid, loop = 0) {
    var itemsProcessed = 0

    channel.messages.fetch({
        limit: 100,
        before: messageid
    }).then(messages => messages.array().forEach(
        (message) => {
            itemsProcessed++
            message.delete({ timeout: 10 })
            
            if (itemsProcessed === messages.array().length) {
                if (itemsProcessed == 100) {
                    logger.log('debug', `100 messages scanned to nuke continuing - total ${((loop * 100) + itemsProcessed)} messages from ${channel.name} in ${channel.guild.name}`)
                    nukemessages(channel, message.id, ++loop)
                } else 
                    logger.log('info', `End reached ${((loop * 100) + itemsProcessed)} messages scanned to nuke from ${channel.name} in ${channel.guild.name}`)
            }
        }
    ))
}