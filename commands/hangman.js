const hangman = require("../systems/hangman")

module.exports = {
    "name": "hangman",
    "description": "play a hangman minigame",
    "format": "hangman",
    "subcommands": [
        { name: "start", description: "Start a new hangman game" },
        { name: "guess", description: "Guess a letter or the full word", options: [
            { type: "string", name: "guess", description: "A letter or the full word", required: true }
        ] },
        { name: "help", description: "Show the current game state or start a new game" }
    ],
    "function": function run(message) {
        hangman.run(message)
    }
}