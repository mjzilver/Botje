var express = require('express');
var app = express();

app.set('view engine', 'pug')

var server = require('http').createServer(app)
var port = 1500

const sqlite3 = require('sqlite3');
var db = new sqlite3.Database("./discord.db")

var logger = require('winston').loggers.get('logger');

var bot = global.bot;
var Farm = require("./farm")

// views folder is static so that it wont get to middleware
app.use(express.static(__dirname + '/views'));

app.use('/farms', function(req, res) {
    let selectSQL = 'SELECT * FROM farm';
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

// start server both
server.listen(port, () => {
	logger.info('App running on port ' + port)
});
