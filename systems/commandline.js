const readline = require("readline")

const logger = require("./logger")

class commandLine {
    constructor() {
        this.commands = require("./commandLoader").clcommands

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        })

        this.rl.on("line", this.handleCommand.bind(this))
    }

    handleCommand(input) {
        const args = input.split(" ")
        const command = args.shift().toLowerCase()

        if (command in this.commands) {
            this.commands[command].function(args)
        } else {
            const { textOnly } = require("./stringHelpers")
            if (textOnly(command) !== "")
                logger.console(`${command} is not a command`)
        }
    }
}

module.exports = new commandLine()