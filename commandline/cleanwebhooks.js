module.exports = async function clean(input) {
    for (const [channelID, channel] of bot.bot.channels.cache.entries()) {
        if (channel.type == "text") {
            channel.fetchWebhooks().then((webhooks) => {
                webhooks.forEach((webhook) => {
                    console.log(webhook)
                    webhook.delete();
                });
            });
        }
    }
}