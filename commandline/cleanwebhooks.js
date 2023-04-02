let webhook = require('../systems/webhook')

module.exports = {
    'name': 'cleanwebhooks',
    'description': 'removes all webhooks from all channels',
    'format': 'cleanwebhooks',
    'function': async function clean(input) {
        for (const [channelId, channel] of bot.client.channels.cache.entries()) {
            if (channel.type == "GUILD_TEXT") {
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