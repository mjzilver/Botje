const { config } = require("systems/settings.js")
const database = require("systems/database.js")
const logger = require("systems/logger.js")
const { Transport } = require("winston")
const CommandLine = require("systems/commandline.js")

class terminalLoggerTransport extends Transport {
    constructor(options, socket) {
        super(options)
        this.socket = socket
    }

    log(info, callback) {
        setImmediate(() => {
            this.emit("logged", info)
        })

        this.socket.emit("message", {
            level: info.level,
            message: info.message,
            timestamp: new Date().toLocaleString("nl-NL")
        })

        callback()
    }
}

class SocketHandler {
    constructor(io) {
        this.io = io
        this.editPerPerson = []
        this.connectCounter = 0

        this.io.on("connection", (socket) => {
            this.handleConnection(socket)
        })

        const terminalNamespace = io.of("/terminal")

        terminalNamespace.on("connection", (socket) => {
            this.handleTerminalConnection(socket)
        })
    }

    handleTerminalConnection(socket) {
        socket.emit("message", {
            level: "console",
            message: "Connected to terminal",
            timestamp: new Date().toLocaleString("nl-NL")
        })

        // connect logger to terminal
        logger.add(new terminalLoggerTransport({
            level: "console"
        }, socket))

        socket.on("command", (command) => {
            // send back the command to the client
            socket.emit("message", {
                level: "console",
                message: command,
                timestamp: new Date().toLocaleString("nl-NL")
            })

            // execute the command
            CommandLine.handleCommand(command)
        })

        socket.on("disconnect", () => {
            logger.remove(terminalLoggerTransport)
        })
    }

    handleConnection(socket) {
        this.io.emit("connectCounter", ++this.connectCounter)

        socket.on("pixelChange", async(pixel) => {
            await this.handlePixelChange(socket, pixel)
        })

        socket.on("disconnect", () => {
            this.handleDisconnect(socket)
        })
    }

    async handlePixelChange(socket, pixel) {
        const { editPerPerson } = this
        if (
            this.spamChecker(socket.id, editPerPerson)
            && pixel.x >= 0
            && pixel.x < config.image.size
            && pixel.y >= 0
            && pixel.y < config.image.size
        ) {
            const insertSQL = `
            INSERT INTO colors 
            (x, y, red, green, blue) 
            VALUES ($1, $2, $3, $4, $5)
                ON CONFLICT (x, y) 
                DO UPDATE SET 
                    red = EXCLUDED.red, 
                    green = EXCLUDED.green, 
                    blue = EXCLUDED.blue;`

            database.insert(insertSQL, [pixel.x, pixel.y, pixel.red, pixel.green, pixel.blue], () => {
                this.io.emit("pixelChanged", pixel)
                if (editPerPerson[socket.id] === undefined) {
                    editPerPerson[socket.id] = [new Date()]
                } else {
                    editPerPerson[socket.id].push(new Date())
                }
            })
        } else {
            logger.warn("User kicked for invalid emit")
            socket.disconnect() // user gets kicked
        }
    }

    handleDisconnect(socket) {
        this.io.emit("connectCounter", --this.connectCounter)
        const { editPerPerson } = this
        if (editPerPerson && editPerPerson[socket.id]) {
            delete editPerPerson[socket.id]
        }
    }

    spamChecker(id, editPerPerson) {
        if (editPerPerson[id]) {
            if (editPerPerson[id].length >= 10) {
                delete editPerPerson[id]
                return true
            }
            const recentEdits = editPerPerson[id].filter((timestamp) => {
                const currentTime = new Date()
                const timePassed = currentTime.getTime() - timestamp.getTime()
                return timePassed < 200
            })
            return recentEdits.length < 2
        }
        return true
    }
}

module.exports = SocketHandler
