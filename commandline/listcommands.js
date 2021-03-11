const { Console } = require('winston/lib/winston/transports');

module.exports = function listcommands() {
    commands = require('../commandholders/commands.js');
    console.log(`=== All chat commands === `)
    for (const [name, functions] of Object.entries(commands)) 
        console.log(`Name: ${name} Functions: ${functions}`);
    
    clcommands = require('../commandholders/clcommands.js');
    console.log(`=== All console commands === `)
    for (const [name, functions] of Object.entries(clcommands)) 
        console.log(`Name: ${name} Functions: ${functions}`);
}