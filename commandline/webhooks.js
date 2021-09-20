module.exports = {
    'name': 'webhooks',
    'description': 'lists all webhooks in all channels',
    'format': 'webhooks',
    'function': async function webhooks(input) {
        for (const [channelId, channel] of bot.client.channels.cache.entries()) {
            if (channel.type == "GUILD_TEXT") {
                channel.fetchWebhooks().then((webhooks) => {
                    webhooks.forEach((webhook) => {
                        logger.console(webhook)
                    })
                })
            }
        }
    }
}