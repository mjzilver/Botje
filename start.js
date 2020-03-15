var discord = require('discord.js');

global.discord = discord;
global.bot = new discord.Client({
    autoReconnect: true
})

// Configure logger settings
const {
    format,
    loggers,
    transports
} = require('winston')

const { combine, timestamp, json } = format;

loggers.add('logger', {
    format: combine(
    timestamp({
      format: 'DD-MM-YYYY HH:mm:ss'
    }),
    json()),
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

var logger = require('winston').loggers.get('logger');

// catches all errors
process.on('uncaughtException', function (error) {
    logger.error(error.message);
});

require('./bot.js');
require('./web.js');