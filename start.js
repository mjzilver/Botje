global.discord = require('discord.js')

global.package = require('./package.json')
global.config = require('./config.json')

global.request = require('request')
global.fs = require('fs')

global.logger = require('./systems/logger.js')
global.database = require('./systems/database.js')
global.logic = require('./systems/logic.js') // move
global.commandline = require('./systems/commandline.js')
global.bot = require('./systems/bot.js')
global.web = require('./systems/web.js')
global.backupsystem = require('./systems/backup.js') // move
global.replysystem = require('./systems/reply.js') // move
global.webhook = require('./systems/webhook.js')
global.spellcheck = require('./systems/spellcheck.js') // move
global.nonselector = require('./systems/nonselector.js') // move