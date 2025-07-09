const bot = require("systems/bot.js")
const logger = require("systems/logger.js")

const options = {
    limit: 5,
    order: "desc",
    level: "error",
}

module.exports = async function log(message) {
    logger.query(options, async (err, results) => {
        if (err) {
            logger.warn(`Error in log query: ${err}`)
            return
        }

        let logs = results.file
        if (options.level)
            logs = logs.filter(log => log.level === options.level)
        logs = logs.slice(0, options.limit)

        if (logs.length === 0) {
            bot.messageHandler.send(message, "No logs found in the last 24 hours.")
            return
        }

        bot.messageHandler.send(
            message,
            `Found ${logs.length} error logs in the last 24 hours. Fetching details...`
        )
        logs.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            .map(log => {
                const timestamp = new Date(log.timestamp).toLocaleString("nl-NL")

                bot.messageHandler.send(
                    message,
                    `Log at ${timestamp} level: ${log.level} ${log.message}`
                )
            })
    })
}