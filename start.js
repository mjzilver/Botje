global.discord = require('discord.js');

global.package = require('./package.json');
global.config = require('./config.json');

global.logger = require('./systems/logger.js');
global.database = require('./systems/database.js');
global.commandline = require('./systems/commandline.js');
global.bot = require('./systems/bot.js');
global.web = require('./systems/web.js');
global.backupsystem = require('./systems/backupsystem')

global.fs = require('fs')
global.request = require('request');

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1).toLocaleLowerCase();
}

String.prototype.isImage = function() {
    return this.match(new RegExp(/(?:http(s?):)*\.(jpe?g|gif|png)/i, "i"))
}

String.prototype.isLink = function() {
    return this.match(new RegExp(/(http(s?):|www).*?/, "gi"))
}

String.prototype.normalizeSpaces = function() {
    return this.replace(new RegExp(/  +/gi, "gi"), ' ');
}

String.prototype.textOnly = function() {
    return this.replace(new RegExp(/[^a-zA-Z ]/gi, "gi"), '');
}

String.prototype.removeQuotes = function() {
    return this.replace(new RegExp(/"/gi, "gi"), '');
}

global.randomBetween = function(min, max) { 
    return Math.floor(Math.random() * (max - min + 1) + min);
}

process.on('uncaughtException', function (error) {
    logger.error(error.message);
});
