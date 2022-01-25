var hangman = require('../systems/hangman.js')

module.exports = {
    'name': 'hangman',
    'description': 'get the commands for a hangman minigame - see hangman help',
    'format': 'hangman',
    'function':  function run(message) {
        hangman.run(message)
    }
}