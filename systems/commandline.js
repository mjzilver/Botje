class commandline {
    constructor() {
        this.commands = require('../commandholders/clcommands.js')
        const readline = require('readline')

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        })

        this.rl.on('line', (input) => {
            const args = input.split(' ')
            const command = args.shift().toLowerCase()

            if (command in this.commands)
                this.commands[command](args)
        })
    }
}

module.exports = new commandline()