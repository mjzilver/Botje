global.package = require('./package.json');
global.config = require('./config.json');
global.logger = require('./logger.js');

// catches all errors
process.on('uncaughtException', function (error) {
    global.logger.error(error.message);
});

global.database = require('./database.js');
global.discord = require('discord.js');
global.cl = require('./cl.js');
global.bot = require('./bot.js');
global.web = require('./web.js');