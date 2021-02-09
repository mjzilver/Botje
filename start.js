global.package = require('./package.json');
global.config = require('./config.json');
global.logger = require('./logger.js');
global.database = require('./database.js');
global.discord = require('discord.js');
global.commandline = require('./commandline.js');
global.bot = require('./bot.js');
global.web = require('./web.js');

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1).toLocaleLowerCase();
}

String.prototype.isImage = function() {
    return this.match(new RegExp(/(?:http(s?):)*\.(jpe?g|gif|png)/, "i"))
}

process.on('uncaughtException', function (error) {
    logger.error(error.message);
});
