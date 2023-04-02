webhook = require('../systems/webhook.js') 

class Webhook {
    constructor() { }

    async fetch(channel) {
        if (channel && channel.type == "GUILD_TEXT") {
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
            async (member) => {
                webhook.send({
                    content: text,
                    username: member.user.nickname ? member.user.nickname : member.user.username,
                    avatarURL: member.user.displayAvatarURL()
                })
            })
    }
}

module.exports = new Webhook()