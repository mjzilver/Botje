const bot = require("systems/bot.js")
const logger = require("systems/logger.js")

module.exports = {
    "name": "exportdb",
    "description": "exports the database to an SQL file",
    "format": "exportdb",
    "function": function exportDatabase() {
        logger.console("Exporting database...")
        bot.backupHandler.exportDatabase()
    }
}