const readline = require('readline');

class IO {
    constructor() {
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false
        }); 

        this.rl.on('line', (input) => {
            console.log(`Received: ${input}`);
        });
    }
}

module.exports = new IO();