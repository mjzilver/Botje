const logger = require("systems/logger.js")
const database = require("systems/database.js")
const formatter = new Intl.NumberFormat("de-DE")

module.exports = {
    name: "report",
    description: "reports information about bot's process",
    format: "report",
    function: () => {
        try {
            const { rss, heapUsed, heapTotal } = process.memoryUsage()
            logger.debug(`Memory: rss ${Math.round(rss / 1024 / 1024 * 100) / 100} MB`)
            logger.debug(`Memory: heapUsed ${Math.round(heapUsed / 1024 / 1024 * 100) / 100} MB`)
            logger.debug(`Memory: heapTotal ${Math.round(heapTotal / 1024 / 1024 * 100) / 100} MB`)

            const sql = `SELECT pg_size_pretty(pg_database_size('botdb')) AS size, 
            COUNT(messages.id) as count FROM messages`

            database.query(sql, null, (rows) => {
                logger.debug(`Database size: ${rows[0]["size"]}`)
                logger.debug(`Message count: ${formatter.format(rows[0]["count"])}`)
            })
        } catch (error) {
            logger.debug(`Error: ${error.message}`)
        }
    }
}