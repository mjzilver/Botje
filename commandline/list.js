module.exports = {
    'name': 'list',
    'description': 'lists all channels in all guilds',
    'format': 'list',
    'function': function list(input) {
        for (const [channelID, channel] of bot.client.channels.cache.entries())
            if (channel.type == "text")
                logger.console(`${channelID} == ${channel.name} -- ${channel.guild.name}`)
    }
}