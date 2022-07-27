class WebServer {
    constructor() {
        var express = require('express')
        var expressapp = express()
        expressapp.set('view engine', 'pug')

        var server = require('http').createServer(expressapp)
        var io = require('socket.io').listen(server)
        global.io = io
        this.moment = require('moment')

        // logs the edits per peron
        this.editPerPerson = []
        this.connectCounter = 0

        expressapp.use(express.static(__dirname + '/../views'))
        expressapp.use(express.json())
        expressapp.use(express.urlencoded({ extended: true }))

        expressapp.get('/log', function (req, res) {
            const options = { limit: 10000, order: 'desc' }

            logger.query(options, async function (err, results) {
                if (err)
                    logger.warn('Error in query' + err)

                var logs = []
                if (req.query.level) {
                    for (var i = 0; i < results.file.length; i++)
                        if (results.file[i].level == req.query.level)
                            logs.push(results.file[i])
                } else
                    logs = results.file

                res.render('log', {
                    list: logs
                })
            })
        })

        expressapp.get('/interact', function (req, res) {
            let selectSQL = `SELECT user_id, user_name, COUNT(message) AS amount 
            FROM messages
            GROUP BY user_id 
            ORDER BY amount DESC`

            const channels = Object.fromEntries(bot.client.channels.cache.filter(channel => channel.type == 'GUILD_TEXT'))
            var guilds = Object.fromEntries(bot.client.guilds.cache)
            var commands = (require('../commandholders/commands.js'))

            database.db.all(selectSQL, [], async (err, rows) => {
                rows.unshift({ 'user_id': '542721460033028117', 'user_name': 'Botje' })

                res.render('interact', {
                    'guilds': guilds,
                    'channels': channels,
                    'users': rows,
                    'commandNames': commands
                })
            })
        })

        expressapp.post('/interact', function (req, res) {
            webhook.sendMessage(req.body.channel, req.body.text, req.body.user)
        })

        expressapp.get('/draw', function (req, res) {
            let selectSQL = 'SELECT * FROM colors ORDER BY y, x ASC'

            var pixels = new Array(config.image.size)
            for (var i = 0; i < pixels.length; i++) {
                pixels[i] = new Array(config.image.size)
                for (var j = 0; j < pixels[i].length; j++) {
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
                res.render('pixels', {
                    pixels: pixels
                })
            })
        })

        // needs to be last
        expressapp.use('/', function (req, res) {
            res.render('index')
        })

        io.on('connection', function (socket) {
            io.emit('connectCounter', ++web.connectCounter)

            socket.on('pixelChange', function (pixel) {
                if (web.spamChecker(socket.id) && (pixel.x >= 0 && pixel.x < config.image.size && pixel.y >= 0 && pixel.y < config.image.size)) {
                    var insert = database.db.prepare('INSERT OR REPLACE INTO colors (x, y, red, green, blue) VALUES (?, ?, ?, ?, ?)', [pixel.x, pixel.y, pixel.red, pixel.green, pixel.blue])

                    insert.run(function (err) {
                        if (err) {
                            logger.info("failed to insert pixel")
                            socket.disconnect() // user gets kicked
                        } else {
                            io.emit('pixelChanged', pixel)
                            if (web.editPerPerson[socket.id] == undefined)
                                web.editPerPerson[socket.id] = [new Date()]
                            else
                                web.editPerPerson[socket.id].push(new Date())
                        }
                    })
                } else {
                    logger.warn("User kicked for invalid emit")
                    socket.disconnect() // user gets kicked
                }
            })

            socket.on('disconnect', function () {
                io.emit('connectCounter', --web.connectCounter)
                delete web.editPerPerson[socket.id]
            })
        })

        server.listen(global.config.port, () => {
            logger.startup('Webserver running on port ' + global.config.port)
        })
    }

    spamChecker(id) {
        if (web.editPerPerson[id] == undefined)
            return true
        else {
            if (web.editPerPerson[id].length >= 10) {
                delete web.editPerPerson[id]
                return true
            } else {
                var count = 0
                for (const index in web.editPerPerson[id]) {
                    var currentTimestamp = new Date()
                    var edited_at = web.editPerPerson[id][index]
                    var time_passed = (new Date(currentTimestamp.getTime() - edited_at.getTime())).getTime()

                    if (time_passed < 200)
                        count++
                }
                if (count >= 2)
                    return false
            }
            return true
        }
    }
}

module.exports = new WebServer()