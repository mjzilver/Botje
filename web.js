var express = require('express');
var app = express();

app.set('view engine', 'pug')

var server = require('http').createServer(app)
var port = 80

// views folder is static so that it wont get to middleware
app.use(express.static(__dirname + '/views'));

app.use('/', function(req,res) { 

    res.render('index') 
});

// start server both
server.listen(port, () => {
	console.log('App running on port ' + port)
});
