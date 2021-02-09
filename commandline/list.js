module.exports = function list(input) {
    let channels = bot.bot.channels.cache;

    for (const [channelID, channel] of channels.entries()) {
        if(channel.type == "text")
            console.log(`${channelID} == ${channel.name} -- ${channel.guild.name}`);
    }
}