class WebServer {
    constructor() {
        var express = require('express');
        var expressapp = express();
        expressapp.set('view engine', 'pug')
        var port = 1500
        
        expressapp.use(express.static(__dirname + '/views'));

        expressapp.use('/', function (req, res) {
            res.render('index')
        });


        var server = require('http').createServer(expressapp)
        server.listen(port, () => {
            logger.info('App running on port ' + port)
        });
    } 

}

module.exports = new WebServer();