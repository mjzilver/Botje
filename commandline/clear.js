let logger = require("systems/logger.js")

module.exports = {
    "name": "clear",
    "description": "clears the console without effecting the logs",
    "format": "clear",
    "function": function clear() {
        console.clear()
        logger.console("Console was cleared")
    }
}