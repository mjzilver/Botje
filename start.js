var Discord = require('discord.js');

global.bot = new Discord.Client({autoReconnect:true})

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

var logger = require('winston').loggers.get('logger');

process.on('uncaughtException', function (error) {
    console.log('error caught')
    logger.error(error.stack);
});

require('./bot.js');
require('./web.js');
