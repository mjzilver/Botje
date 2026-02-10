const discord = require("discord.js")

const bot = require("../../systems/bot")
const logger = require("../../systems/logger")

module.exports = {
    "name": "list",
    "description": "lists all channels in all guilds",
    "format": "list",
    "function": function list() {
        const channels = []
        for (const [channelId, channel] of bot.client.channels.cache.entries())
            if (channel.type === discord.ChannelType.GuildText)
                channels.push({ channelId, channel })

        channels.sort((a, b) => {
            const nameA = a.channel.guild.name.toLowerCase()
            const nameB = b.channel.guild.name.toLowerCase()
            if (nameA < nameB) return -1
            if (nameA > nameB) return 1
            return 0
        })

        logger.printColumns([
            channels.map(({ channelId }) => channelId),
            channels.map(({ channel }) => channel.name),
            channels.map(({ channel }) => channel.guild.name)
        ],
        ["Channel ID", "Channel Name", "Guild Name"])
    }
}