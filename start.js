// Configure logger settings
const { format, loggers, transports } = require('winston')

loggers.add('logger', {
    format: format.json(),
    transports: [
        new (transports.Console)({
            colorize: true,
            level: 'debug'
        }),
        new (transports.File)({
            filename: 'bot.log',
            level: 'debug',
        })
    ]
});

require('./bot.js');
require('./web.js');
