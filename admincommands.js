var purge = require('./admincommands/purge.js');
var disallow = require('./admincommands/disallow.js');

var commands = {
    "purge" : purge,
    "disallow" : disallow
}

module.exports = commands