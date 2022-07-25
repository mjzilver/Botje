class Readback {
    constructor() {
        bot.client.on('ready', () => {
            for (const [channelId, channel] of bot.client.channels.cache.entries())
                if (channel.type == "GUILD_TEXT" && channel.viewable)
                    this.readMessages(channel)
        })
    }

    readMessages(channel) {
        channel.messages.fetch({
            limit: 100
        }).then(messages => {
            var botReply = 100 

            var yesterday = new Date() - 24 * 60 * 60 * 1000
            messages.forEach(
                (message) => {
                    var messageTime = new Date(message.createdTimestamp)
                    if (messageTime > yesterday) {
                        if (message.content.match(new RegExp(config.prefix, "i"))) {
                            if (botReply > 5) 
                                command.handleCommand(message)
                        } else if (message.author.id == bot.client.user.id) {
                            botReply = 0
                        } else {
                            botReply++
                        }
                    }
                }
            )
        })
    }
}

module.exports = new Readback()