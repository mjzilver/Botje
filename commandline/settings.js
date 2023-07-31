const { config, updateConfigVariable } = require("systems/settings")
const logger = require("systems/logger.js")

module.exports = {
    "name": "settings",
    "description": "changes the bot's settings",
    "format": "settings <setting> <value>",
    "function": (input) => {
        const setting = input[0]
        const value = input[1]

        if (!setting || !value) {
            logger.console("Current settings:")
            for (const [key, value] of Object.entries(config)) {
                logger.console(`${key}: ${value}`)
            }
        } else {
            updateConfigVariable(setting, value)
            logger.console(`Updated ${setting} to ${value}`)
        }
    }
}