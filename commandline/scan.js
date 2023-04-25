let bot = require("systems/bot.js")

module.exports = {
    "name": "scan",
    "description": "saves all messages in all channels",
    "format": "scan [amount]?",
    "function": function scan(input) {
        const save = require("save")

        for (const [channelId, channel] of bot.client.channels.cache.entries())
            if (channel.type == "GUILD_TEXT")
                save.function([channelId, input])
    }
}