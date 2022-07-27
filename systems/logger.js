const Winston = require('winston')

const { combine, timestamp, colorize, printf, json } = Winston.format

const loggerLevels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
    console: 4,
    admin: 5,
    startup: 6
}

Winston.loggers.add('logger', {
    levels: loggerLevels,
    transports: [
        new (Winston.transports.Console)({
            colorize: true,
            level: 'startup',
            format: combine(
                timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
                colorize(),
                printf(output => `${output.timestamp} ${output.level}: ${output.message}`)
            )
        }),
        new (Winston.transports.File)({
            filename: 'bot.log',
            level: 'admin',
            format: combine(
                timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
                json()
            )
        })
    ]
})

Winston.addColors({
    console: 'grey',
    admin: 'yellow',
    startup: 'magenta'
})

module.exports = Winston.loggers.get('logger')