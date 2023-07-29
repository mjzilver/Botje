const hangman = require("systems/hangman")

module.exports = {
    "name": "guess",
    "description": "guess in hangman - see hangman help",
    "format": "guess [letter]",
    "function": function guess(message) {
        const args = message.cleanContent.toLowerCase().split(" ")
        hangman.guess(message, args[1])
    }
}