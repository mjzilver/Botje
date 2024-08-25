const logger = require("systems/logger.js")
const readline = require("readline")

class commandLine {
    constructor() {
        this.commands = require("systems/commandLoader.js").clcommands

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

        if (command in this.commands)
            this.commands[command].function(args)
        else if (command.textOnly() !== "")
            logger.console(`${command} is not a command`)
    }
}

module.exports = new commandLine()