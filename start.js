global.discord = require('discord.js')

global.package = require('./package.json')
global.config = require('./config.json')

global.request = require('request')
global.fs = require('fs')

global.logger = require('./systems/logger.js')
global.database = require('./systems/database.js')
global.logic = require('./systems/logic.js')
global.commandline = require('./systems/commandline.js')
global.command = require('./systems/command.js')
global.bot = require('./systems/bot.js')
global.web = require('./systems/web.js')
global.backupsystem = require('./systems/backup.js')
global.replysystem = require('./systems/reply.js')
global.webhook = require('./systems/webhook.js')
global.spellcheck = require('./systems/spellcheck.js')
global.nonselector = require('./systems/nonselector.js')
global.readback = require('./systems/readback.js')

process.on('exit', function () {
    logger.info( `=== Botje shutting down, goodbye ===`)
})

process.on('SIGINT', function () {
    logger.info( `=== Botje forced to shut down, goodbye ===`)
})

process.on('uncaughtException', function (error) {
    logger.error(error.message)
})
