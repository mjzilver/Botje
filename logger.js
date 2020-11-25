const { format, loggers, transports } = require('winston')

const { combine, timestamp, colorize, printf} = format;

loggers.add('logger', {
    format: combine(
        timestamp({ format: 'DD-MM-YYYY HH:mm:ss' }),
        colorize(),
        printf(output => `${output.timestamp} ${output.level}: ${output.message}`)
    ),
    transports: [
        new(transports.Console)({
            colorize: true,
            level: 'debug'
        }),
        new(transports.File)({
            filename: 'bot.log',
            level: 'debug',
        })
    ]
});

module.exports = require('winston').loggers.get('logger');