const logger = require("systems/logger.js")
const database = require("systems/database.js")

module.exports = {
    name: "checkdupes",
    description: "checks the database for duplicate entries, use -d yes for deletion",
    format: "checkdupes",
    function: () => {
        try {
            const sql = `SELECT message, datetime, COUNT(message) AS count
                FROM messages 
                GROUP BY message, datetime 
                HAVING COUNT(message) >= 2 
                ORDER BY COUNT(message) DESC;`

            database.query(sql, null, (rows) => {
                logger.debug(`Found ${rows.length} duplicates`)

                rows.forEach((row) => {
                    logger.debug(`Duplicate: ${row.message} (${row.datetime}) - ${row.count} times`)
                })
            })
        } catch (error) {
            logger.debug(`Error: ${error.message}`)
        }
    }
}