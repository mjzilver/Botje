module.exports = async function clean(input) {
    var channel = bot.bot.channels.cache.get(input[0]);

    var webhooks = await channel.fetchWebhooks();
    for (const [id, webhook] of webhooks) {
        console.log(webhook)
        webhook.delete()
    }
}
