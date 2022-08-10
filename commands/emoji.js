var emoji_values = require('../json/emoji.json')

module.exports = {
    'name': 'emoji',
    'description': 'turns your message into emojis',
    'format': 'emoji [string]',
    'function': function emoji(message) {
        if (message.type === 'REPLY') {
            message.channel.messages.fetch(message.reference.messageId)
                .then(replyMessage => {
                    var sentence = message.content.split(' ').slice(1)
                    sentence = sentence.join(' ')
                    sentence = sentence.toLowerCase()

                    for (var i = 0; i < sentence.length; i++) {
                        if (sentence.charAt(i) >= 'a' && sentence.charAt(i) <= 'z')
                            replyMessage.react(emoji_values['letter_' + sentence.charAt(i)])
                    }

                    message.delete({
                        timeout: 1000
                    })
                })
        } else {
            var sentence = message.content.split(' ').slice(1)

            sentence = sentence.join(' ')
            sentence = sentence.toLowerCase()
            var result = ''
            if (sentence.length > 0) {
                for (var i = 0; i < sentence.length; i++) {
                    if (sentence.charAt(i) >= 'a' && sentence.charAt(i) <= 'z')
                        result += emoji_values['letter_' + sentence.charAt(i)]
                    result += ' '
                }
            }
            bot.message.send(message, result)
        }
    }
}