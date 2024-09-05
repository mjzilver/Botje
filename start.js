process.env.NODE_PATH = __dirname
// this makes sure the require statements work as expected
// https://nodejs.org/api/modules.html#modules_loading_from_the_global_folders
require("module").Module._initPaths()

class Startup {
    constructor() {
        this.startupTime = new Date()

        this.stringUtils = require("systems/stringUtils")

        this.bot = require("systems/bot")

        if (process.argv.includes("--web")) {
            this.webServer = require("systems/web/web")
        }
        this.commandLine = require("systems/commandline")
    }
}

new Startup()