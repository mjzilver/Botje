module.exports = function say(input) {
    var channel = bot.bot.channels.cache.get(input[0])
    input.shift()
    channel.send(input.join(' '))
}