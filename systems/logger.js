const Winston = require("winston")

const { combine, timestamp, colorize, printf, json } = Winston.format

const loggerLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    console: 4,
    repeat: 5,
    startup: 6
}

Winston.addColors({
    console: "grey",
    deletion: "yellow",
    startup: "magenta",
    repeat: "cyan",
})

const logger = Winston.createLogger({
    levels: loggerLevels,
    transports: [
        new Winston.transports.Console({
            level: "startup",
            format: combine(
                timestamp({ format: "DD-MM-YYYY HH:mm:ss" }),
                colorize(),
                printf(output => `${output.timestamp} ${output.level}: ${output.message}`)
            )
        }),
        new Winston.transports.File({
            filename: "bot.log",
            level: "debug",
            format: combine(
                timestamp(),
                json()
            )
        })
    ]
})

logger.printColumns = (arrays, headers = [], loggerFn = logger.console) => {
    if (!arrays.length) return
    const rowCount = arrays[0].length
    const colWidths = arrays.map(col => Math.max(...col.map(val => String(val).length)))

    if (headers) {
        const headerLine = headers.map((val, i) =>
            String(val).padEnd(colWidths[i])
        ).join(" | ")
        loggerFn(headerLine)
        loggerFn(colWidths.map(w => "=".repeat(w)).join(" | "))
    }

    for (let row = 0; row < rowCount; row++) {
        const line = arrays.map((col, i) =>
            String(col[row]).padEnd(colWidths[i])
        ).join(" | ")
        loggerFn(line)
    }
}

logger.printRows = (rows, loggerFn = logger.console) => {
    if (!rows.length) return
    const colCount = rows[0].length
    const colWidths = Array.from({ length: colCount }, (_, i) =>
        Math.max(...rows.map(row => String(row[i]).length))
    )

    for (const row of rows) {
        const line = row.map((val, i) =>
            String(val).padEnd(colWidths[i])
        ).join(" | ")

        loggerFn(line)
    }
}

// override logger.error to print stack
const originalError = logger.error
logger.error = (message, ...args) => {
    if (message instanceof Error) {
        originalError(message.stack || message.toString(), ...args)
    } else {
        originalError(message, ...args)
    }
}

module.exports = logger
