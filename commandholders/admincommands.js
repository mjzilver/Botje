let commands = {
    "purge": require("../admincommands/purge.js"),
    "disallow": require("../admincommands/disallow.js"),
    "nuke": require("../admincommands/nuke.js"),
    "deleteafter": require("../admincommands/deleteafter.js"),
    "addmeme": require("../admincommands/addmeme.js")
}

module.exports = commands