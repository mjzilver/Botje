let logger = require("systems/logger.js")

module.exports = {
    name: "level",
    description: "sets logging level",
    format: "level <level>",
    function: (input) => {
        if (input[0] && logger.levels[input[0]]) {
            logger.transports[0].level = input[0]
            logger.console(`Logging level set to ${logger.transports[0].level}`)
        } else {
            logger.console(`Available logging levels: ${Object.keys(logger.levels).join(", ")}`)
            logger.console(`Current logging level is ${logger.transports[0].level}`)
        }
    }
}