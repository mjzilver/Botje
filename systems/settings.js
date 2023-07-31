const fs = require("fs")
const configFilePath = "./config.json"
const logger = require("systems/logger.js")

let config = {}

function loadConfigFromFile() {
    try {
        const configData = fs.readFileSync(configFilePath, "utf8")
        config = JSON.parse(configData)
    } catch (err) {
        logger.error("Error loading config file:", err)
    }
}

function saveConfigToFile() {
    try {
        const configData = JSON.stringify(config, null, 2)
        fs.writeFileSync(configFilePath, configData, "utf8")
    } catch (err) {
        logger.error("Error saving config file:", err)
    }
}

function updateConfigVariable(updatedConfig) {
    Object.assign(config, updatedConfig)
    saveConfigToFile()
}

// Load the config from the file when the module is required.
loadConfigFromFile()

// Export the functions and config object so other classes can access them.
module.exports = {
    config,
    updateConfigVariable,
}
