const logger = require("systems/logger.js")

module.exports = {
    "name": "commands",
    "description": "shows description and format for all chat commands",
    "format": "commands",
    "function": function commands() {
        const commands = require("systems/commandLoader.js").commands

        logger.printColumns([
            Object.values(commands).map(cmd => cmd.name),
            Object.values(commands).map(cmd => cmd.format),
            Object.values(commands).map(cmd => cmd.description)
        ],
        ["Name", "Format", "Description"])
    }
}
