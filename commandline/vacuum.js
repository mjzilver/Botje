let database = require("systems/database.js")
let logger = require("systems/logger.js")

module.exports = {
    "name": "vacuum",
    "description": "removes leftover data from the database",
    "format": "vacuum",
    "function": function vacuum() {
        logger.console("===== Database being vacuumed =====")

        database.db.run("VACUUM", [], (err) => {
            if (err)
                return console.error(err.message)
            logger.console("Vacuuming completed")
        })
    }
}