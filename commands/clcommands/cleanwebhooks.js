const discord = require("discord.js")
const bot = require("../../systems/bot")
const logger = require("../../systems/logger")

module.exports = {
    "name": "cleanwebhooks",
    "description": "removes all webhooks from all text channels",
    "format": "clear",
    "function": async function clean() {
        for (const [, channel] of bot.client.channels.cache.entries())
            if (channel.type === discord.ChannelType.GuildText)
                channel.fetchWebhooks().then(webhooks => {
                    webhooks.forEach(webhook => {
                        logger.console(webhook)
                        webhook.delete()
                    })
                })
    }
}