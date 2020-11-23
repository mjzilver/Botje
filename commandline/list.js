module.exports = function list(input) {
    let channels = global.bot.bot.channels;

    for (const [channelID, channel] of channels.entries()) {
        if(channel.type == "text")
            console.log(`${channelID} == ${channel.name} -- ${channel.guild.name}`);
    }
}