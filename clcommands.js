var list = require('./commandline/list.js');
var save = require('./commandline/save.js');
var shutdown = require('./commandline/shutdown.js');
var erase = require('./commandline/erase.js');
var clear = require('./commandline/clear.js');
var dbinfo = require('./commandline/dbinfo.js'); 
var listcommands = require('./commandline/listcommands.js'); 
var fullscan = require('./commandline/fullscan.js'); 
var saveemotes = require('./commandline/saveemotes.js'); 

var commands = {
    "list" : list,
    "save" : save,
    "shutdown" : shutdown,
    "erase" : erase,
    "clear" : clear,
    "dbinfo" : dbinfo,
    "fullscan" : fullscan,
    "saveemotes" : saveemotes,
    "listcommands" : listcommands
}

module.exports = commands