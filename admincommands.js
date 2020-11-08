var catalog = require('./admincommands/catalog.js');
var purge = require('./admincommands/purge.js');

var commands = {
    "catalog" : catalog,
    "purge" : purge
}

module.exports = commands