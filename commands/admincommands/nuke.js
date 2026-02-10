const discord = require("discord.js")

const bot = require("../../systems/bot")
const logger = require("../../systems/logger")

module.exports = async function nuke(message) {
    if (message.author.id === message.guild.ownerId) {
        const filter = launchMessage => {
            return (launchMessage.content.startsWith("launch") && launchMessage.author.id === message.author.id)
        }

        message.channel.awaitMessages({ filter, max: 1, time: 60000 })
            .then(() => {
                bot.messageHandler.send(message, "Nuke launched. Blowout soon, fellow stalker.")
                nukeguild(message)
            })
        bot.messageHandler.send(message, "Nuke armed to confirm launch type 'launch' to launch the nuke, this cannot be cancelled. This nuke will delete every message in every channel of this disscord.")
    } else {
        bot.messageHandler.send(message, "Only the server owner may send the nuke.")
    }
}

function nukeguild(message) {
    for (const [channelId, channel] of bot.client.channels.cache.entries())
        if (channel.type === discord.ChannelType.GuildText && channel.guild.id === message.guild.id)
            nukechannel(channelId)
}

function nukechannel(channelId) {
    const channels = bot.client.channels.cache
    const channel = channels.find(c => c.id === channelId)

    if (channel && channel.type === discord.ChannelType.GuildText) {
        nukemessages(channel, channel.lastMessageId)
        channel.lastMessage?.delete({ timeout: 100 })
        logger.warn(`NUKING channel: ${channel.name}`)
    } else {
        logger.console("Channel not found")
    }
}

function nukemessages(channel, messageid, loop = 0) {
    let itemsProcessed = 0

    channel.messages.fetch({
        limit: 100,
        before: messageid
    }).then(messages => messages.forEach(
        message => {
            itemsProcessed++
            message?.delete({ timeout: 10 })

            if (itemsProcessed === messages.size)
                if (itemsProcessed === 100) {
                    logger.console(`100 messages scanned to nuke continuing - total ${((loop * 100) + itemsProcessed)} messages from ${channel.name} in ${channel.guild.name}`)
                    nukemessages(channel, message.id, ++loop)
                } else {
                    logger.warn(`End reached ${((loop * 100) + itemsProcessed)} messages scanned to nuke from ${channel.name} in ${channel.guild.name}`)
                }
        }
    ))
}