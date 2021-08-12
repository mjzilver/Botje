var list = require('../commandline/list.js')
var save = require('../commandline/save.js')
var exit = require('../commandline/exit.js')
var erase = require('../commandline/erase.js')
var clear = require('../commandline/clear.js')
var dbinfo = require('../commandline/dbinfo.js')
var listcommands = require('../commandline/listcommands.js')
var fullscan = require('../commandline/fullscan.js')
var saveemotes = require('../commandline/saveemotes.js')
var expunge = require('../commandline/expunge.js')
var vacuum = require('../commandline/vacuum.js')
var say = require('../commandline/say.js')
var pretend = require('../commandline/pretend.js')
var cleanwebhooks = require('../commandline/cleanwebhooks.js')

var commands = {
    "list": list,
    "save": save,
    "exit": exit,
    "erase": erase,
    "clear": clear,
    "dbinfo": dbinfo,
    "fullscan": fullscan,
    "saveemotes": saveemotes,
    "listcommands": listcommands,
    "expunge": expunge,
    "vacuum": vacuum,
    "say": say,
    "pretend": pretend,
    "cleanwebhooks": cleanwebhooks
}

module.exports = commands