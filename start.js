global.package = require('./package.json')
global.config = require('./config.json')

global.request = require('request')
global.fs = require('fs')

global.logger = require('./systems/logger.js')
global.database = require('./systems/database.js')

let commandline = require('./systems/commandline.js')
global.bot = require('./systems/bot.js')
global.web = require('./systems/web.js')
