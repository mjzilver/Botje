let logger = require("systems/logger.js")

module.exports = {
    "name": "help",
    "description": "shows description and format for each command",
    "format": "help",
    "function": function help() {
        let clcommands = require("commandholders/clcommands.js")
        logger.console("=== All console commands === ")
        for (const [, functions] of Object.entries(clcommands))
            logger.console(`${functions.name} - FORMAT: ${functions.format} - ${functions.description}`)
        logger.console("============================")
    }
}