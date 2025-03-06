const projectPackage = require("package.json")
const logger = require("systems/logger.js")

class Webhook {
    constructor() { }

    async fetch(channel) {
        if (channel && channel.type === "GUILD_TEXT") {
            const webhooks = await channel.fetchWebhooks()
            for (const [, webhook] of webhooks)
                if (webhook.name === projectPackage.name) {
                    logger.console("Found webhook")
                    return webhook
                }

            logger.console("making new webhook")
            return await channel.createWebhook(projectPackage.name)
        }
    }

    sendMessage(channelid, text, userid, bot = null) {
        if (bot === null)
            bot = require("systems/bot.js")

        const channel = bot.client.channels.cache.get(channelid)

        this.fetch(channel).then((webhook) => {
            // If the channel is not found, return
            if (!channel) return

            channel.guild.members.fetch(userid).then(
                (member) => {
                    webhook.send({
                        content: text,
                        username: member.user.displayName ? member.user.displayName : member.user.username,
                        avatarURL: member.user.displayAvatarURL()
                    })
                })
        })
    }
}

module.exports = new Webhook()