const discord = require("discord.js")
const bot = require("../../systems/bot")

module.exports = {
    "name": "scan",
    "description": "saves all messages in all channels",
    "format": "scan [amount]?",
    "function": function scan(input) {
        const save = require("./save")

        for (const [channelId, channel] of bot.client.channels.cache.entries())
            if (channel.type === discord.ChannelType.GuildText)
                save.function([channelId, input])
    }
}