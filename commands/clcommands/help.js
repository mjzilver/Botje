const logger = require("../../systems/logger")

module.exports = {
    "name": "help",
    "description": "shows description and format for each console command",
    "format": "help",
    "function": function help() {
        const clcommands = require("../../systems/commandLoader").clcommands
        logger.printColumns([
            Object.values(clcommands).map(cmd => cmd.name),
            Object.values(clcommands).map(cmd => cmd.format),
            Object.values(clcommands).map(cmd => cmd.description)
        ],
        ["Name", "Format", "Description"])
    }
}