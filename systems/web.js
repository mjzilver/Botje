let webhook = require("./webhook.js")
let config = require("../config.json")
let database = require("./database.js")
let bot = require("./bot.js")
let logger = require("./logger.js")

class WebServer {
    constructor() {
        const express = require("express")
        const app = express()
        app.set("view engine", "pug")
        app.use(express.static(__dirname + "/../views"))
        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))

        const server = require("http").createServer(app)
        const io = require("socket.io").listen(server)
        global.io = io

        this.editPerPerson = []
        this.connectCounter = 0

        app.get("/log", function (req, res) {
            const options = {
                limit: 10000,
                order: "desc",
                from: new Date(0),
                until: new Date,
            }

            logger.query(options, async function (err, results) {
                if (err)
                    logger.warn("Error in query" + err)

                let logs = []
                if (req.query.level) {
                    for (let i = 0; i < results.file.length; i++)
                        if (results.file[i].level == req.query.level)
                            logs.push(results.file[i])
                } else
                    logs = results.file

                res.render("log", {
                    list: logs
                })
            })
        })

        app.get("/interact", function (req, res) {
            let selectSQL = `SELECT user_id, user_name, COUNT(message) AS amount 
            FROM messages
            GROUP BY user_id 
            ORDER BY amount DESC`

            const channels = Object.fromEntries(bot.client.channels.cache.filter(channel => channel.type == "GUILD_TEXT"))
            let guilds = Object.fromEntries(bot.client.guilds.cache)
            let commands = (require("../commandholders/commands.js"))

            database.db.all(selectSQL, [], async (err, rows) => {
                rows.unshift({ "user_id": "542721460033028117", "user_name": "Botje" })

                res.render("interact", {
                    "guilds": guilds,
                    "channels": channels,
                    "users": rows,
                    "commandNames": commands
                })
            })
        })

        app.post("/interact", function (req) {
            webhook.sendMessage(req.body.channel, req.body.text, req.body.user)
        })

        app.get("/draw", function (req, res) {
            let selectSQL = "SELECT * FROM colors ORDER BY y, x ASC"

            let pixels = new Array(config.image.size)
            for (let i = 0; i < pixels.length; i++) {
                pixels[i] = new Array(config.image.size)
                for (let j = 0; j < pixels[i].length; j++) {
                    pixels[i][j] = {
                        y: i,
                        x: j,
                        red: 255,
                        green: 255,
                        blue: 255
                    }
                }
            }

            database.db.all(selectSQL, [], async (err, rows) => {
                for (let i = 0; i < rows.length; i++) {
                    const element = rows[i]

                    if (element.x >= 0 && element.x < config.image.size && element.y >= 0 && element.y < config.image.size) {
                        pixels[element.y][element.x] = {
                            y: element.y,
                            x: element.x,
                            red: element.red,
                            green: element.green,
                            blue: element.blue
                        }
                    }
                }
                res.render("pixels", {
                    pixels: pixels
                })
            })
        })

        // needs to be last
        app.use("/", function (req, res) {
            res.render("index")
        })

        io.on("connection", (socket) => {
            io.emit("connectCounter", ++this.connectCounter)

            socket.on("pixelChange", async (pixel) => {
                const { editPerPerson } = this
                if (this.spamChecker(socket.id, editPerPerson) && (pixel.x >= 0 && pixel.x < config.image.size && pixel.y >= 0 && pixel.y < config.image.size)) {
                    const insert = database.db.prepare("INSERT OR REPLACE INTO colors (x, y, red, green, blue) VALUES (?, ?, ?, ?, ?)", [pixel.x, pixel.y, pixel.red, pixel.green, pixel.blue])

                    try {
                        await insert.run()
                        io.emit("pixelChanged", pixel)
                        if (editPerPerson[socket.id] == undefined) {
                            editPerPerson[socket.id] = [new Date()]
                        } else {
                            editPerPerson[socket.id].push(new Date())
                        }
                    } catch (err) {
                        logger.info("failed to insert pixel")
                        socket.disconnect() // user gets kicked
                    }
                } else {
                    logger.warn("User kicked for invalid emit")
                    socket.disconnect() // user gets kicked
                }
            })

            socket.on("disconnect", () => {
                io.emit("connectCounter", --this.connectCounter)
                const { editPerPerson } = this
                if (editPerPerson && editPerPerson[socket.id]) {
                    delete editPerPerson[socket.id]
                }
            })
        })

        server.listen(config.port, () => {
            logger.startup(`Webserver running on port ${config.port}`)
        })
    }

    spamChecker(id, editPerPerson) {
        if (editPerPerson[id]) {
            if (editPerPerson[id].length >= 10) {
                delete editPerPerson[id]
                return true
            } else {
                const recentEdits = editPerPerson[id].filter(timestamp => {
                    const currentTime = new Date()
                    const timePassed = currentTime.getTime() - timestamp.getTime()
                    return timePassed < 200
                })
                return recentEdits.length < 2
            }
        }
        return true
    }
}

module.exports = new WebServer()