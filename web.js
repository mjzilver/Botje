var express = require('express');
var app = express();

app.set('view engine', 'pug')

var server = require('http').createServer(app)
var io = require('socket.io').listen(server)
global.io = io;
var port = 1500

var imageSize = require('./config.json').imageSize;

const sqlite3 = require('sqlite3');
var db = new sqlite3.Database("./discord.db")

var logger = require('winston').loggers.get('logger');

var bot = global.bot;
var Farm = require("./farm")

// views folder is static so that it wont get to middleware
app.use(express.static(__dirname + '/views'));

app.use('/draw', function(req, res) {
    let selectSQL = 'SELECT * FROM colors ORDER BY y, x ASC';

    var pixels = new Array(imageSize);
    for (var i = 0; i < pixels.length; i++) {
        pixels[i] = new Array(imageSize);
        for (var j = 0; j < pixels[i].length; j++) {
            pixels[i][j] = {y: i, x: j, red: 255, green: 255, blue: 255};
        }
    }

    db.all(selectSQL, [], async (err, rows) => {
        for (let i = 0; i < rows.length; i++) {
            const element = rows[i];
            
            if(element.x >= 0 && element.x < imageSize && element.y >= 0 && element.y < imageSize)
            {
                pixels[element.y][element.x] = {y: element.y, x: element.x, red: element.red, green: element.green, blue: element.blue};
            }
        }
        res.render('pixels', {pixels: pixels});
    })
});

app.use('/farms', function(req, res) {
    let selectSQL = 'SELECT * FROM farm ORDER BY tier + yield + fence_tier DESC';
    db.all(selectSQL, [], async (err, rows) => {
        let farms = [];
        for (var i = 0; i < rows.length; i++) {
            let user = await bot.fetchUser(rows[i].user_id)
            let farm = await Farm.init(user).toJSON();
            farms[i] = farm
        }
        res.render('farms', { list: farms })
    })
});

app.use('/', function(req, res) { 
    res.render('index') 
});

io.on('connection', function(socket){
    socket.on('pixelChange', function(pixel){

        if(pixel.x >= 0 && pixel.x < imageSize && pixel.y >= 0 && pixel.y < imageSize)
        {
            var insert = db.prepare('INSERT OR REPLACE INTO colors (x, y, red, green, blue) VALUES (?, ?, ?, ?, ?)', [pixel.x, pixel.y, pixel.red, pixel.green, pixel.blue]);
                                
            insert.run(function(err){				
                if(err)
                {
                    logger.info("failed to insert pixel");
                }
                else
                {
                    io.emit('pixelChanged', pixel);
                }
            });
        }
    });
});

// start server both
server.listen(port, () => {
	logger.info('App running on port ' + port)
});
