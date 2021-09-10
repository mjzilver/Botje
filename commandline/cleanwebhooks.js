module.exports = {
    'name': 'cleanwebhooks',
    'description': 'removes all webhooks from all channels',
    'format': 'cleanwebhooks',
    'function': async function clean(input) {
        for (const [channelID, channel] of bot.client.channels.cache.entries()) {
            if (channel.type == "text") {
                channel.fetchWebhooks().then((webhooks) => {
                    webhooks.forEach((webhook) => {
                        logger.console(webhook)
                        webhook.delete()
                    })
                })
            }
        }
    }
}