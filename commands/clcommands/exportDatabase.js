const bot = require("../../systems/bot")
const logger = require("../../systems/logger")

module.exports = {
    "name": "exportdb",
    "description": "exports the database to an SQL file",
    "format": "exportdb",
    "function": function exportDatabase() {
        logger.console("Exporting database...")
        bot.backupHandler.exportDatabase()
    }
}