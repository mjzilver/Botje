const fs = require("fs")
const path = require("path")

// Initialize objects to hold commands
const commands = {}
const admincommands = {}
const dmcommands = {}
const clcommands = {}

function loadCommands(dirPath, commandObject) {
    const files = fs.readdirSync(dirPath)

    for (const file of files) {
        if (file.endsWith(".js")) {
            const command = require(path.join(dirPath, file))
            if (command.name) {
                commandObject[command.name] = command
            }
        }
    }
}

const baseDir = `${__dirname }/../`

loadCommands(path.join(baseDir, "commands"), commands)
loadCommands(path.join(baseDir, "admincommands"), admincommands)
loadCommands(path.join(baseDir, "clcommands"), clcommands)
loadCommands(path.join(baseDir, "dmcommands"), dmcommands)

module.exports = {
    "admincommands": admincommands,
    "commands": commands,
    "dmcommands": dmcommands,
    "clcommands": clcommands
}