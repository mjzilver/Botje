
module.exports = function fullscan(input) {
    for (const [channelID, channel] of bot.bot.channels.cache.entries()) 
        if(channel.type == "text")
            nuke([channelID])
}

function nuke(input) {
    let channels = bot.bot.channels.cache;

    var channelId = input.shift()
    var amount = (input[0] ? input[0] : 1000000); // if no set amount 1 million is set as the max OR the end is reached
    var channel = channels.find(c => c.id === channelId)

    if(channel && channel.type == "text" && channel.guild.id == "445564853399191562") 
        catalog(channel, channel.lastMessageID, amount)
    else
        console.log('Channel not found')
}

function catalog(channel, messageid, amount, loop = 0) {
    var itemsProcessed = 0;

    channel.messages.fetch({
            limit: (amount - itemsProcessed < 100 ? amount - itemsProcessed : 100),
            before: messageid
        })
    .then(messages => messages.array().forEach(
        (message) => {
            itemsProcessed++;

            if((message.attachments.size > 0 || message.embeds.length > 0 || message.content.isLink()) && message.author.id == "237344593094377475")
            {
                logger.log('warn', 'NUKING message: ' + message);
                message.delete({ timeout: 5000 })
            }

            if (itemsProcessed === messages.array().length) {
                if (itemsProcessed == 100) {
                    if(amount > 0)
                    {
                        logger.log('debug', `100 messages scanned to nuke continuing - total ${((loop * 100) + itemsProcessed)} messages from ${channel.name} in ${channel.guild.name}`)
                        catalog(channel, message.id, amount, ++loop);
                    } else 
                        logger.log('info', `Set amount reached ${((loop * 100) + itemsProcessed)} messages scanned to nuke from ${channel.name} in ${channel.guild.name}`)
                } else 
                    logger.log('info', `End reached ${((loop * 100) + itemsProcessed)} messages scanned to nuke from ${channel.name} in ${channel.guild.name}`)
            }
        }
    ));
}
