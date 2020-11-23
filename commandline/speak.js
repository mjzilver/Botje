module.exports = function speak(input) {
    let channels = global.bot.bot.channels;

    var channelId = input.shift()
    var channel = channels.find(c => c.id === channelId)

    if(channel)
        channel.send(input.join(' '))
    else
        console.log('Channel not found')
}