class WebServer {
    constructor() {
        var express = require('express')
        var expressapp = express()
        expressapp.set('view engine', 'pug')

        var server = require('http').createServer(expressapp)
        var io = require('socket.io').listen(server)
        global.io = io
        var port = 1500
        this.moment = require('moment')

        // logs the edits per peron
        this.editPerPerson = []
        this.connectCounter = 0
        this.imageSize = 150

        expressapp.use(express.static(__dirname + '/../views'))

        expressapp.use('/log', function (req, res) {
            const options = { limit: 10000, order: 'desc' }

            logger.query(options, function (err, results) {
                if (err)
                    logger.warn('Error in query' + err)

                var logs = []

                if (req.query.level)
                    for (var i = 0; i < results.file.length; i++) 
                        if (results.file[i].level == req.query.level)
                            logs.push(results.file[i])
                else
                    logs = results.file

                res.render('log', {
                    list: logs
                })
            })
        })

        expressapp.use('/draw', function (req, res) {
            let selectSQL = 'SELECT * FROM colors ORDER BY y, x ASC'

            var pixels = new Array(web.imageSize)
            for (var i = 0; i < pixels.length; i++) {
                pixels[i] = new Array(web.imageSize)
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

                    if (element.x >= 0 && element.x < web.imageSize && element.y >= 0 && element.y < web.imageSize) {
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
                if (web.spamChecker(socket.id) && (pixel.x >= 0 && pixel.x < web.imageSize && pixel.y >= 0 && pixel.y < web.imageSize)) {
                    var insert = database.db.prepare('INSERT OR REPLACE INTO colors (x, y, red, green, blue) VALUES (?, ?, ?, ?, ?)', [pixel.x, pixel.y, pixel.red, pixel.green, pixel.blue])

                    insert.run(function (err) {
                        if (err) {
                            logger.info("failed to insert pixel")
                            socket.disconnect(); // user gets kicked
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
                    socket.disconnect(); // user gets kicked
                }
            })

            socket.on('disconnect', function () {
                io.emit('connectCounter', --web.connectCounter)
                delete web.editPerPerson[socket.id]
            })
        })

        server.listen(port, () => {
            logger.info('Webserver running on port ' + port)
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
                    var edited_at = web.moment(web.editPerPerson[id][index])
                    var time_passed = web.moment.duration(web.moment().diff(edited_at)).asMilliseconds()

                    if (time_passed < 200)
                        count++
                }
                if (count >= 3)
                    return false
            }
            return true
        }
    }
}

module.exports = new WebServer()