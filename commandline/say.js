module.exports = {
    'name': 'say',
    'description': 'makes the bot say the string in the given channel',
    'format': 'say [channelid] [string]',
    'function': function say(input) {
        if (input[0] && !isNaN(input[0])) {
            let channel = bot.client.channels.cache.get(input[0])
            if (channel) {
                input.shift()
                channel.send(input.join(' '))
            } else {
                logger.console('Channel not found')
            }
        } else {
            logger.console(`Invalid input`)
        }
    }
}