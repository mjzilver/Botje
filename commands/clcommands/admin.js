const logger = require("systems/logger.js")

module.exports = {
    "name": "admin",
    "description": "shows description and format for all admin commands",
    "format": "admin",
    "function": function commands() {
        const admincommands = require("systems/commandLoader.js").admincommands

        console.log("Admin commands:")
        console.log(admincommands)
    }
}
