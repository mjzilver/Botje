const { config } = require("./settings")

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase()
}

function isImage(str) {
    return str.match(new RegExp(/(?:http(s?):)*\.(jpe?g|gif|png)$/i, "i"))
}

function isLink(str) {
    return str.match(new RegExp(/(http(s?):|www).*?/, "gi"))
}

function normalizeSpaces(str) {
    return str.replace(new RegExp(/(^ +| +$|  +)/gi, "gi"), " ")
}

function textOnly(str) {
    return str.replace(new RegExp(/[^a-zA-Z ]/gi, "gi"), "")
}

function removeQuotes(str) {
    return str.replace(new RegExp(/"/gi, "gi"), "")
}

function removePrefix(str) {
    return str.replace(new RegExp(config.prefix, "i"), "")
}

function removeCommand(str) {
    return str.replace(new RegExp(`^${config.prefix}[a-zA-Z]+\\s*`, "i"), "")
}

function removeCommands(str) {
    return str.replace(new RegExp(`${config.prefix}[a-zA-Z]+\\s*`, "i"), "")
}

function replaceFancyQuotes(str) {
    return str.replace(/[“”„]/g, "\"")
        .replace(/[‘’‚‛]/g, "'")
}

function sanitizeFilename(str) {
    return str.replace(/[/:*?"<>|\\]/g, "_")
}

function replaceAt(str, index, replacement) {
    return str.substring(0, index) + replacement + str.substring(index + replacement.length)
}

module.exports = {
    capitalize,
    isImage,
    isLink,
    normalizeSpaces,
    textOnly,
    removeQuotes,
    removePrefix,
    removeCommand,
    removeCommands,
    replaceFancyQuotes,
    sanitizeFilename,
    replaceAt
}
