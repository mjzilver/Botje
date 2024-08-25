const logger = require("systems/logger.js")

module.exports = {
    name: "query",
    description: "query the log",
    format: "query -l <level> -a <amount> -f <filter>",
    function: (input) => {
        const options = {
            limit: 1000,
            order: "desc",
            from: new Date(0),
            until: new Date,
        }

        const args = input.join(" ").split("-")

        for (const arg of args) {
            const [key, value] = arg.split(" ")

            if (key === "l")
                options.level = value
            if (key === "a")
                options.limit = parseInt(value)
            if (key === "f")
                options.filter = value
        }

        logger.query(options, async function(err, results) {
            if (err)
                logger.warn(`Error in query${err}`)

            let logs = results.file
            if (options.level)
                logs = results.file.filter(log => log.level === options.level)
            if (options.filter)
                logs = results.file.filter(log => log.message.includes(options.filter))

            // chop off the logs if there are too many
            if (logs.length > options.limit)
                logs = logs.slice(0, options.limit)

            if (logs.length === 0) {
                logger.repeat("No logs found")
                return
            }

            for (const log of logs) {
                const timestamp = new Date(log.timestamp).toLocaleString("nl-NL")
                logger.repeat(`${timestamp} level: ${log.level} ${log.message}`)
            }
        })
    }
}