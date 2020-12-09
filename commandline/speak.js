module.exports = function speak(input) {
    let channels = bot.bot.channels.cache;

    var channelId = input.shift()
    var channel = channels.find(c => c.id === channelId)

    if(channel)
        channel.send(input.join(' '))
    else
        console.log('Channel not found')
}