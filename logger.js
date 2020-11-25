const { format, loggers, transports } = require('winston')

const { combine, timestamp, colorize, printf, json} = format;

loggers.add('logger', {
    transports: [
        new(transports.Console)({
            colorize: true,
            level: 'debug',
            format: combine(
                timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
                colorize(),
                printf(output => `${output.timestamp} ${output.level}: ${output.message}`)
            )
        }),
        new(transports.File)({
            filename: 'bot.log',
            level: 'debug',
            format: combine(
                timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
                json()
            )
        })
    ]
});

module.exports = require('winston').loggers.get('logger');