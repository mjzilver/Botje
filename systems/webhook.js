let projectPackage = require("../package.json") 
let bot = require("./bot.js")
let logger = require("./logger.js")

class Webhook {
    constructor() { }

    async fetch(channel) {
        if (channel && channel.type == "GUILD_TEXT") {
            let webhooks = await channel.fetchWebhooks()
            for (const [, webhook] of webhooks) {
                if (webhook.name == projectPackage.name) {
                    logger.console("Found webhook")
                    return webhook
                }
            }
            logger.console("making new webhook")
            return await channel.createWebhook(projectPackage.name)
        }
    }

    async sendMessage(channelid, text, userid) {
        let channel = bot.client.channels.cache.get(channelid)
        let webhook = await this.fetch(channel)

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