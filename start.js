global.discord = require('discord.js')

global.package = require('./package.json')
global.config = require('./config.json')

global.request = require('request')
global.fs = require('fs')

global.logger = require('./systems/logger.js')
global.database = require('./systems/database.js')

global.commandline = require('./systems/commandline.js')
global.bot = require('./systems/bot.js')
global.web = require('./systems/web.js')

global.webhook = require('./systems/webhook.js') // needs redo and moving

/**
 * TO DO
 * 
 * Required:
 *  
 * Write tests -> some function that just tests 
 *      all commands 
 *      all commandline 
 *      all systems (most if not all systems are included in all commands)
 *      all webpages
 * 
 * potential: 
 * 
 * More OOP: move ALL classes to bot - keep bot global?
 * 
 */