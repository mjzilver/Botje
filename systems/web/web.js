const { config } = require("systems/settings.js")
const logger = require("systems/logger.js")
const featureFlags = require("./featureFlags")

class WebServer {
    constructor() {
        const express = require("express")
        const app = express()
        app.set("view engine", "pug")
        app.set("views", `${__dirname }/views`)
        app.use(express.static(`${__dirname }/static`))
        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))

        const server = require("http").createServer(app)
        const io = require("socket.io").listen(server)
        global.io = io

        this.editPerPerson = []
        this.connectCounter = 0

        if (featureFlags.enableTerminal) {
            app.use("/terminal", require("./routes/terminal"))
        }

        if (featureFlags.enableLog) {
            app.use("/log", require("./routes/log"))
        }

        if (featureFlags.enableWebhooks) {
            app.use("/webhooks", require("./routes/webhooks"))
        }

        if (featureFlags.enableDraw) {
            app.use("/draw", require("./routes/draw"))
        }

        // needs to be last
        app.use("/", require("./routes/index"))

        const SocketHandler = require("./socketHandler")
        new SocketHandler(io)

        server.listen(config.port, () => {
            logger.startup(`Webserver running on port ${config.port}`)
        })
    }
}

module.exports = new WebServer()