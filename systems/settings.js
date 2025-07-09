const fs = require("fs")
const configFilePath = "./config.json"
const logger = require("./logger")

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

function updateConfigVariable(key, value) {
    config[key] = value
    saveConfigToFile()
}

loadConfigFromFile()

module.exports = {
    config,
    updateConfigVariable,
}
