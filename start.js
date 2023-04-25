process.env.NODE_PATH = __dirname;
require('module').Module._initPaths();

// start up the 3 main systems
require("systems/bot.js")
require("systems/web.js")
require("systems/commandline.js")

