const fs = require("fs")
const path = require("path")

const commands = {}
const admincommands = {}
const dmcommands = {}
const clcommands = {}

function loadCommands(dirPath, commandObject) {
    const files = fs.readdirSync(dirPath)

    for (const file of files) {
        if (file.endsWith(".js")) {
            const command = require(path.join(dirPath, file))
            if (command.disabled !== true) {
                commandObject[command.name] = command
            }

            if (command.aliases !== undefined) {
                for (const alias of command.aliases.split(",")) {
                    commandObject[alias] = command
                }
            }
        }
    }
}

const baseDir = `${__dirname }/../`

loadCommands(path.join(baseDir, "commands"), commands)
loadCommands(path.join(baseDir, "commands/listers"), commands)
loadCommands(path.join(baseDir, "commands/admincommands"), admincommands)
loadCommands(path.join(baseDir, "commands/clcommands"), clcommands)
loadCommands(path.join(baseDir, "commands/dmcommands"), dmcommands)

module.exports = {
    "admincommands": admincommands,
    "commands": commands,
    "dmcommands": dmcommands,
    "clcommands": clcommands
}