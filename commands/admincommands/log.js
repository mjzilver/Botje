const bot = require("systems/bot.js")
const logger = require("systems/logger.js")

const options = {
    limit: 5,
    order: "desc",
    from: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
    until: new Date(),
    level: "error",
}

module.exports = async function log(message) {
    logger.query(options, async function(err, results) {
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

        const logMessages = logs.map(log => {
            const timestamp = new Date(log.timestamp).toLocaleString("nl-NL")
            return `${timestamp} level: ${log.level} ${log.message}`
        }).join("\n")

        bot.messageHandler.send(
            message,
            `Last ${logs.length} error logs in the last 24 hours:\n${logMessages}`
        )
    })
}