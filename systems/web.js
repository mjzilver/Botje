const webhook = require("./webhook.js")
const config = require("../config.json")
const database = require("./database.js")
const bot = require("./bot.js")
const logger = require("./logger.js")

class WebServer {
    constructor() {
        const express = require("express")
        const app = express()
        app.set("view engine", "pug")
        app.use(express.static(`${__dirname }/../views`))
        app.use(express.json())
        app.use(express.urlencoded({ extended: true }))

        const server = require("http").createServer(app)
        const io = require("socket.io").listen(server)
        global.io = io

        this.editPerPerson = []
        this.connectCounter = 0

        app.get("/log", function(req, res) {
            const options = {
                limit: 10000,
                order: "desc",
                from: new Date(0),
                until: new Date,
            }

            logger.query(options, async function(err, results) {
                if (err)
                    logger.warn(`Error in query${ err}`)

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

        app.get("/interact", function(req, res) {
            const selectSQL = `SELECT user_id, user_name, COUNT(message)
            FROM messages
            GROUP BY user_id, user_name
            ORDER BY COUNT(message) DESC`

            const channels = Object.fromEntries(bot.client.channels.cache.filter(channel => channel.type == "GUILD_TEXT"))
            const guilds = Object.fromEntries(bot.client.guilds.cache)
            const commands = (require("commandholders/commands.js"))

            database.query(selectSQL, [], async(rows) => {
                rows.unshift({ "user_id": "542721460033028117", "user_name": "Botje" })

                res.render("interact", {
                    "guilds": guilds,
                    "channels": channels,
                    "users": rows,
                    "commandNames": commands
                })
            })
        })

        app.post("/interact", function(req) {
            webhook.sendMessage(req.body.channel, req.body.text, req.body.user)
        })

        app.get("/draw", function(req, res) {
            const selectSQL = "SELECT * FROM colors ORDER BY y, x ASC"

            const pixels = new Array(config.image.size)
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

            database.query(selectSQL, [], async(rows) => {
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
        app.use("/", function(req, res) {
            res.render("index")
        })

        io.on("connection", (socket) => {
            io.emit("connectCounter", ++this.connectCounter)

            socket.on("pixelChange", async(pixel) => {
                const { editPerPerson } = this
                if (this.spamChecker(socket.id, editPerPerson) && (pixel.x >= 0 && pixel.x < config.image.size && pixel.y >= 0 && pixel.y < config.image.size)) {
                    const insertSQL = `INSERT INTO colors (x, y, red, green, blue) VALUES ($1, $2, $3, $4, $5)
                    ON CONFLICT (x, y) DO UPDATE SET red = EXCLUDED.red, green = EXCLUDED.green, blue = EXCLUDED.blue;`

                    database.insert(insertSQL, [pixel.x, pixel.y, pixel.red, pixel.green, pixel.blue], () => {
                        io.emit("pixelChanged", pixel)
                        if (editPerPerson[socket.id] == undefined) {
                            editPerPerson[socket.id] = [new Date()]
                        } else {
                            editPerPerson[socket.id].push(new Date())
                        }
                    })
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
            }
            const recentEdits = editPerPerson[id].filter(timestamp => {
                const currentTime = new Date()
                const timePassed = currentTime.getTime() - timestamp.getTime()
                return timePassed < 200
            })
            return recentEdits.length < 2
        }
        return true
    }
}

module.exports = new WebServer()