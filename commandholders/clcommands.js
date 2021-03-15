var list = require('../commandline/list.js');
var save = require('../commandline/save.js');
var exit = require('../commandline/exit.js');
var erase = require('../commandline/erase.js');
var clear = require('../commandline/clear.js');
var dbinfo = require('../commandline/dbinfo.js'); 
var listcommands = require('../commandline/listcommands.js'); 
var fullscan = require('../commandline/fullscan.js'); 
var saveemotes = require('../commandline/saveemotes.js'); 
var nukekanna = require('../commandline/nukekanna.js'); 

var commands = {
    "list" : list,
    "save" : save,
    "exit" : exit,
    "erase" : erase,
    "clear" : clear,
    "dbinfo" : dbinfo,
    "fullscan" : fullscan,
    "saveemotes" : saveemotes,
    "nukekanna" : nukekanna,
    "listcommands" : listcommands
}

module.exports = commands