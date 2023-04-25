let logger = require("systems/logger.js")

class commandline {
    constructor() {
        this.commands = require("commandholders/clcommands.js")
        const readline = require("readline")

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        })

        this.rl.on("line", (input) => {
            const args = input.split(" ")
            const command = args.shift().toLowerCase()

            if (command in this.commands)
                this.commands[command].function(args)
            else if (command.textOnly() !== "")
                logger.console(`${command} is not a command`)
        })
    }
}

module.exports = new commandline()