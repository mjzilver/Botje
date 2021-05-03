module.exports = function listcommands() {
    commands = require('../commandholders/commands.js');
    console.log(`=== All chat commands === `)
    for (const [name, functions] of Object.entries(commands))
        console.log(`${name}`);

    clcommands = require('../commandholders/clcommands.js');
    console.log(`=== All console commands === `)
    for (const [name, functions] of Object.entries(clcommands))
        console.log(`${name}`);

    admincommands = require('../commandholders/admincommands.js');
    console.log(`=== All admin commands === `)
    for (const [name, functions] of Object.entries(admincommands))
        console.log(`${name}`);
}