module.exports = function listcommands() {
    commands = require('../commandholders/commands.js')
    logger.console(`=== All chat commands === `)
    for (const [name, functions] of Object.entries(commands))
        logger.console(`${name}`)

    clcommands = require('../commandholders/clcommands.js')
    logger.console(`=== All console commands === `)
    for (const [name, functions] of Object.entries(clcommands))
        logger.console(`${name}`)

    admincommands = require('../commandholders/admincommands.js')
    logger.console(`=== All admin commands === `)
    for (const [name, functions] of Object.entries(admincommands))
        logger.console(`${name}`)
}