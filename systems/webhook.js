const projectPackage = require("../package.json")
const bot = require("./bot")
const logger = require("./logger")

class Webhook {
    constructor() { }

    async fetch(channel) {
        if (channel && channel.isTextBased() && channel.guild) {
            const webhooks = await channel.fetchWebhooks()
            for (const [, webhook] of webhooks)
                if (webhook.name === projectPackage.name) {
                    logger.console("Found webhook")
                    return webhook
                }

            logger.console("making new webhook")
            return await channel.createWebhook({ name: projectPackage.name })
        }
        return null
    }

    async sendMessage(channelid, text, userid) {
        const channel = bot.client.channels.cache.get(channelid)
        if (!channel) return false

        try {
            const webhook = await this.fetch(channel)
            if (!webhook) return false

            const member = await channel.guild.members.fetch(userid)
            await webhook.send({
                content: text,
                username: member.user.displayName ? member.user.displayName : member.user.username,
                avatarURL: member.user.displayAvatarURL()
            })
            return true
        } catch (error) {
            logger.error(`Failed to send webhook message: ${error.message}`)
            return false
        }
    }
}

module.exports = new Webhook()