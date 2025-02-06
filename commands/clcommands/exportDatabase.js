const bot = require("systems/bot.js")

module.exports = {
    "name": "exportdb",
    "description": "exports the database to an SQL file",
    "format": "exportdb",
    "function": function exportDatabase() {
        bot.backupHandler.exportDatabase()
    }
}