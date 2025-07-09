const bot = require("systems/bot.js")
const logger = require("systems/logger.js")
const database = require("systems/database.js")
const formatter = new Intl.NumberFormat("en-GB")
const { formatUptime } = require("systems/utils.js")

module.exports = {
    name: "report",
    description: "reports information about bot's process",
    format: "report",
    function: () => {
        try {
            const { rss, heapUsed, heapTotal } = process.memoryUsage()

            const now = new Date()
            const diff = now - bot.client.readyTimestamp
            const formattedUptime = formatUptime(diff)

            const printRows = [
                ["Process ID", process.pid],
                ["Node.js Version", process.version],
                ["Memory: rss", `${Math.round(rss / 1024 / 1024 * 100) / 100} MB`],
                ["Memory: heapUsed", `${Math.round(heapUsed / 1024 / 1024 * 100) / 100} MB`],
                ["Memory: heapTotal", `${Math.round(heapTotal / 1024 / 1024 * 100) / 100} MB`],
                ["Uptime", formattedUptime]
            ]

            const sql = `SELECT pg_size_pretty(pg_database_size('botdb')) AS size, 
            COUNT(messages.id) as count FROM messages`

            database.query(sql, null, (rows) => {
                if (rows.length === 0) {
                    logger.error("No data found in the database.")
                    return
                }

                printRows.push(
                    ["Database Size", rows[0]["size"]],
                    ["Message Count", formatter.format(rows[0]["count"])]
                )

                logger.printRows(printRows, logger.console)
            })
        } catch (error) {
            logger.error(`Error: ${error.message}`)
        }
    }
}