const logger = require("../../systems/logger")

module.exports = {
    "name": "clear",
    "description": "clears the console without effecting the logs",
    "format": "clear",
    "function": function clear() {
        // eslint-disable-next-line no-console
        console.clear()
        logger.console("Console was cleared")
    }
}