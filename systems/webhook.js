class Webhook {
    constructor() {}

    async fetch(channel) {
        if(channel && channel.type == "text") {
            var webhooks = await channel.fetchWebhooks()
            for (const [id, webhook] of webhooks) {
                if (webhook.name == global.package.name) {
                    logger.console('Found webhook')
                    return webhook
                }
            }
            logger.console('making new webhook')
            return await channel.createWebhook(global.package.name)
        }
    }

    async sendMessage(channelid, text, userid) {
        var channel = bot.client.channels.cache.get(channelid)
        var webhook = await this.fetch(channel)

        channel.guild.members.fetch(userid).then(
            async (user) => {
                let member = channel.guild.member(user.user)
                webhook.send(text, {
                    username: member.nickname ? member.nickname : user.user.username,
                    avatarURL: user.user.displayAvatarURL()
                })
            })
    }
}

module.exports = new Webhook()