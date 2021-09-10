module.exports = {
    'name': 'scan',
    'description': 'saves all messages in all channels',
    'format': 'scan [amount]?',
    'function': function scan(input) {
        const save = require("./save")

        for (const [channelID, channel] of bot.client.channels.cache.entries())
            if (channel.type == "text")
                save.function([channelID, input])
    }
}