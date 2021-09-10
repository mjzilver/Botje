module.exports = {
    'name': 'help',
    'description': 'shows description and format for each command',
    'format': 'help',
    'function': function help() {
        clcommands = require('../commandholders/clcommands.js')
        logger.console(`=== All console commands === `)
        for (const [name, functions] of Object.entries(clcommands))
            logger.console(`${functions.name} - FORMAT: ${functions.format} - ${functions.description}`)
        logger.console(`============================`)
    }
}