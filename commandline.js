var list = require('./commandline/list.js');
var speak = require('./commandline/speak.js');
var save = require('./commandline/save.js');
var shutdown = require('./commandline/shutdown.js');
var erase = require('./commandline/erase.js');
var clear = require('./commandline/clear.js');

var commands = {
    "list" : list,
    "speak" : speak,
    "save" : save,
    "shutdown" : shutdown,
    "erase" : erase,
    "clear" : clear,
}

module.exports = commands