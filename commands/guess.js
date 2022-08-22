module.exports = {
    'name': 'guess',
    'description': 'guess in hangman - see hangman help',
    'format': 'guess [letter]',
    'function': function guess(message) {
        var args = message.cleanContent.toLowerCase().split(' ')
        bot.hangman.guess(message, args[1])
    }
}