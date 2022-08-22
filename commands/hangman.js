module.exports = {
    'name': 'hangman',
    'description': 'get the commands for a hangman minigame - see hangman help',
    'format': 'hangman',
    'function': function run(message) {
        bot.hangman.run(message)
    }
}