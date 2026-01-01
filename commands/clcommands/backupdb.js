const bot = require("../../systems/bot")
const logger = require("../../systems/logger")

module.exports = {
    "name": "backupdb",
    "description": "exports the database to an SQL file",
    "format": "backupdb",
    "function": async function backupDatabase() {
        logger.console("Backing up database...")
        await bot.backupHandler.backupDatabase()
    }
}