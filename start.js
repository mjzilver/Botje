process.env.NODE_PATH = __dirname
// this makes sure the require statements work as expected
// https://nodejs.org/api/modules.html#modules_loading_from_the_global_folders
require("module").Module._initPaths()

require("systems/stringUtils.js")

// start up the 3 main systems
require("systems/bot.js")
require("systems/web.js")
require("systems/commandLine.js")