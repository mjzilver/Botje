const discord = require("discord.js")

const bot = require("../../systems/bot")
const logger = require("../../systems/logger")
const MessageIterator = require("../../systems/messageIterator")

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

async function nukeguild(message) {
    for (const [channelId, channel] of bot.client.channels.cache.entries()) {
        if (channel.type === discord.ChannelType.GuildText && channel.guild.id === message.guild.id) {
            await nukechannel(channel)
        }
    }
}

async function nukechannel(channel) {
    if (channel && channel.type === discord.ChannelType.GuildText) {
        logger.warn(`NUKING channel: ${channel.name}`)
        
        const iterator = new MessageIterator({
            onMessage: async (msg) => {
                await msg.delete({ timeout: 10 })
            },
            onComplete: (stats) => {
                logger.warn(`${stats.totalProcessed} messages nuked from ${channel.name} in ${channel.guild.name}`)
            }
        })

        await iterator.iterate(channel)
    } else {
        logger.console("Channel not found")
    }
}