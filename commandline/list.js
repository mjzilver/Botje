module.exports = {
    'name': 'list',
    'description': 'lists all channels in all guilds',
    'format': 'list',
    'function': function list(input) {
        for (const [channelId, channel] of bot.client.channels.cache.entries())
            if (channel.type == "GUILD_TEXT")
                logger.console(`${channelId} == ${channel.name} -- ${channel.guild.name}`)
    }
}