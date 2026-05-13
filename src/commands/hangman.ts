import type { ICommand } from "../interfaces";

export default {
    name: "hangman",
    description: "play a hangman minigame",
    format: "hangman start | hangman guess [letter] | hangman help",
    subcommands: [
        { name: "start", description: "Start a new hangman game" },
        {
            name: "guess",
            description: "Guess a letter or the full word",
            options: [{ type: "string", name: "guess", description: "A letter or the full word", required: true }],
        },
        { name: "help", description: "Show the current game state or start a new game" },
    ],
    function(message, context) {
        context.hangman.run(message);
    },
} satisfies ICommand;
