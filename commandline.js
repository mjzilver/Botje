var list = require('./commandline/list.js');
var speak = require('./commandline/speak.js');
var save = require('./commandline/save.js');

var commands = {
    "list" : list,
    "speak" : speak,
    "save" : save,
}

module.exports = commands