module.exports = async function webhooks(input) {
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