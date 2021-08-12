module.exports = function list(input) {
    for (const [channelID, channel] of bot.client.channels.cache.entries())
        if (channel.type == "text")
            console.log(`${channelID} == ${channel.name} -- ${channel.guild.name}`)
}