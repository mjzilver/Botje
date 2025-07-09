class Startup {
    constructor() {
        this.startupTime = new Date()

        this.stringUtils = require("./systems/stringUtils")

        this.bot = require("./systems/bot")

        if (process.argv.includes("--web"))
            this.webServer = require("./systems/web/web")

        this.commandLine = require("./systems/commandline")
    }
}

new Startup()