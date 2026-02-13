const discord = require("discord.js")

const bot = require("../../systems/bot")
const database = require("../../systems/database")
const logger = require("../../systems/logger")
const MessageIterator = require("../../systems/messageIterator")

module.exports = {
    "name": "save",
    "description": "saves a set of messages from a given channel",
    "format": "save [channelid] [amount]?",
    "function": async function save(input) {
        const channels = bot.client.channels.cache

        if (input[0]) {
            const channelId = input[0]
            const amount = (input[1]?.length !== 0 ? parseInt(input[1]) : 1000000)
            const channel = channels.find(c => c.id === channelId)

            if (channel && channel.type === discord.ChannelType.GuildText) {
                const iterator = new MessageIterator({
                    limit: amount,
                    onMessage: async message => {
                        database.storeMessage(message)
                    },
                    onComplete: stats => {
                        logger.console(`${stats.totalProcessed} messages catalogued from ${channel.name} in ${channel.guild.name}`)
                    }
                })

                await iterator.iterate(channel)
            } else {
                logger.console("Channel not found")
            }
        } else {
            logger.console("No channel id given")
        }
    }
}
