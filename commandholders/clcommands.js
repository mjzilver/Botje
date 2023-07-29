let commands = {
    "list": require("commandline/list.js"),
    "save": require("commandline/save.js"),
    "exit": require("commandline/exit.js"),
    "erase": require("commandline/erase.js"),
    "clear": require("commandline/clear.js"),
    "help": require("commandline/help.js"),
    "scan": require("commandline/scan.js"),
    "saveemotes": require("commandline/saveemotes.js"),
    "heapdump": require("commandline/heapdump.js"),
    "report": require("commandline/report.js"),
    "level": require("commandline/level.js")
}

module.exports = commands