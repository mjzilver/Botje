let logger = require("systems/logger.js")
let database = require("systems/database.js")

module.exports = {
    name: "report",
    description: "reports information about bot's process",
    format: "report",
    function: () => {
        try {
            const { rss, heapUsed, heapTotal } = process.memoryUsage()
            logger.console(`Memory: rss ${Math.round(rss / 1024 / 1024 * 100) / 100} MB`)
            logger.console(`Memory: heapUsed ${Math.round(heapUsed / 1024 / 1024 * 100) / 100} MB`)
            logger.console(`Memory: heapTotal ${Math.round(heapTotal / 1024 / 1024 * 100) / 100} MB`)

            let sql = "SELECT pg_size_pretty(pg_database_size('botdb')) AS size"
            database.query(sql, null, (rows) => {
                logger.console(`Database size: ${rows[0]["size"]}`)
            })
        } catch (error) {
            logger.console(`Error: ${error.message}`)
        }
    }
}