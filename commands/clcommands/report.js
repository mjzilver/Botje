const os = require("os")

const bot = require("../../systems/bot")
const database = require("../../systems/database")
const logger = require("../../systems/logger")
const formatter = new Intl.NumberFormat("en-GB")
const { formatUptime } = require("../../systems/utils")

module.exports = {
    name: "report",
    description: "reports information about bot's process",
    format: "report",
    function: async () => {
        try {
            const { rss, heapUsed, heapTotal } = process.memoryUsage()

            const now = new Date()
            const diff = now - bot.client.readyTimestamp
            const formattedUptime = formatUptime(diff)

            const ipAddress = Object.values(os.networkInterfaces())
                .flat()
                .find(alias => alias.family === "IPv4" && !alias.internal)?.address || "Not found"

            const printRows = [
                ["Process ID", process.pid],
                ["IP address", ipAddress],
                ["Node.js Version", process.version],
                ["Memory: rss", `${Math.round(rss / 1024 / 1024 * 100) / 100} MB`],
                ["Memory: heapUsed", `${Math.round(heapUsed / 1024 / 1024 * 100) / 100} MB`],
                ["Memory: heapTotal", `${Math.round(heapTotal / 1024 / 1024 * 100) / 100} MB`],
                ["Uptime", formattedUptime]
            ]

            const sql = `SELECT pg_size_pretty(pg_database_size('botdb')) AS size, 
            COUNT(messages.id) as count FROM messages`

            const rows = await database.query(sql, [])
            if (rows.length === 0) {
                logger.error("No data found in the database.")
                return
            }

            printRows.push(
                ["Database Size", rows[0]["size"]],
                ["Message Count", formatter.format(rows[0]["count"])]
            )

            printRows.sort((a, b) => a[0].localeCompare(b[0]))

            logger.printRows(printRows, logger.console)
        } catch (error) {
            logger.error(`Error: ${error.message}`)
        }
    }
}