module.exports = {
    'name': 'webhooks',
    'description': 'lists all webhooks in all channels',
    'format': 'webhooks',
    'function': async function webhooks(input) {
        for (const [channelID, channel] of bot.client.channels.cache.entries()) {
            if (channel.type == "text") {
                channel.fetchWebhooks().then((webhooks) => {
                    webhooks.forEach((webhook) => {
                        logger.console(webhook)
                    })
                })
            }
        }
    }
}