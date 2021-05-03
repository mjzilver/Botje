var purge = require('../admincommands/purge.js');
var disallow = require('../admincommands/disallow.js');
var nuke = require('../admincommands/nuke.js');

var commands = {
    "purge": purge,
    "disallow": disallow,
    "nuke": nuke
}

module.exports = commands