const logger = require("../../systems/logger")

module.exports = {
    "name": "commands",
    "description": "shows description and format for all chat commands",
    "format": "commands",
    "function": function commands() {
        const commands = require("../../systems/commandLoader").commands

        logger.printColumns([
            Object.values(commands).map(cmd => cmd.name),
            Object.values(commands).map(cmd => cmd.format),
            Object.values(commands).map(cmd => cmd.description)
        ],
        ["Name", "Format", "Description"])
    }
}
