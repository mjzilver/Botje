var commands = {
    "purge": require('../admincommands/purge.js'),
    "disallow": require('../admincommands/disallow.js'),
    "nuke": require('../admincommands/nuke.js'),
    "reboot": require('../admincommands/reboot.js'),
    "report": require('../admincommands/report.js'),
    "deleteafter": require('../admincommands/deleteafter.js'),
    "addmeme": require('../admincommands/addmeme.js'),
    "spamchecker": require('../admincommands/spamchecker.js')
}

module.exports = commands