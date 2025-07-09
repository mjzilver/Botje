const logger = require("systems/logger.js")
const database = require("systems/database.js")

module.exports = {
    name: "checkdupes",
    description: "checks the database for duplicate entries",
    format: "checkdupes",
    function: () => {
        logger.info("Checking for duplicate entries in the database...")
        try {
            const sql = `SELECT message, datetime, COUNT(message) AS count
                FROM messages 
                GROUP BY message, datetime 
                HAVING COUNT(message) >= 2 
                ORDER BY COUNT(message) DESC;`

            database.query(sql, null, (rows) => {
                logger.console(`Found ${rows.length} duplicates`)

                rows.forEach((row) => {
                    logger.console(`Duplicate: ${row.message} (${row.datetime}) - ${row.count} times`)
                })
            })
        } catch (error) {
            logger.error(`Error: ${error.message}`)
        }
    }
}