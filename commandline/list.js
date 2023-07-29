const bot = require("systems/bot.js")
const logger = require("systems/logger.js")

module.exports = {
    "name": "list",
    "description": "lists all channels in all guilds",
    "format": "list",
    "function": function list() {
        for (const [channelId, channel] of bot.client.channels.cache.entries())
            if (channel.type == "GUILD_TEXT")
                logger.console(`${channelId} == ${channel.name} -- ${channel.guild.name}`)
    }
}