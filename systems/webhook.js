let projectPackage = require("package.json") 
let bot = require("systems/bot.js")
let logger = require("systems/logger.js")

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

    sendMessage(channelid, text, userid) {
        let channel = bot.client.channels.cache.get(channelid)
        this.fetch(channel).then((webhook) => {
            channel.guild.members.fetch(userid).then(
                (member) => {
                    webhook.send({
                        content: text,
                        username: member.user.nickname ? member.user.nickname : member.user.username,
                        avatarURL: member.user.displayAvatarURL()
                    })
                })
        })
    }
}

module.exports = new Webhook()