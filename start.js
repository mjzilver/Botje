global.discord = require('discord.js')

global.package = require('./package.json')
global.config = require('./config.json')

global.request = require('request')
global.fs = require('fs')

global.logger = require('./systems/logger.js')
global.database = require('./systems/database.js')
global.logic = require('./systems/logic.js')
global.commandline = require('./systems/commandline.js')
global.bot = require('./systems/bot.js')
global.web = require('./systems/web.js')
global.backupsystem = require('./systems/backup.js')
global.replysystem = require('./systems/reply.js')
global.webhook = require('./systems/webhook.js')
global.spellcheck = require('./systems/spellcheck.js')
global.nonselector = require('./systems/nonselector.js')

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1).toLocaleLowerCase()
}

String.prototype.isImage = function() {
    return this.match(new RegExp(/(?:http(s?):)*\.(jpe?g|gif|png)$/i, "i"))
}

String.prototype.isLink = function() {
    return this.match(new RegExp(/(http(s?):|www).*?/, "gi"))
}

String.prototype.normalizeSpaces = function() {
    return this.replace(new RegExp(/(^ +| +$|  +)/gi, "gi"), ' ')
}

String.prototype.textOnly = function() {
    return this.replace(new RegExp(/[^a-zA-Z ]/gi, "gi"), '')
}

String.prototype.chatCharsOnly = function() {
    return this.replace(new RegExp(/[^a-zA-Z .,!?]/gi, "gi"), '')
}

String.prototype.removeQuotes = function() {
    return this.replace(new RegExp(/"/gi, "gi"), '')
}

String.prototype.replaceAt = function(index, replacement) {
    return this.substr(0, index) + replacement + this.substr(index + replacement.length)
}

Object.defineProperty(Array.prototype, "pickRandom", {
    enumerable: false,
    value: function(array) { return this[randomBetween(0, this.length - 1)] }
})

global.randomBetween = function(min, max) { 
    return Math.floor(Math.random() * (max - min + 1) + min)
}

process.on('exit', function () {
    logger.info( `=== Botje shutting down, goodbye ===`)
})

process.on('SIGINT', function () {
    logger.info( `=== Botje forced to shut down, goodbye ===`)
})

process.on('uncaughtException', function (error) {
    logger.error(error.message)
})
