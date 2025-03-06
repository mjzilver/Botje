const { config } = require("./settings")
const bot = require("systems/bot.js")

String.prototype.capitalize = function() {
    return this.charAt(0).toUpperCase() + this.slice(1).toLocaleLowerCase()
}

String.prototype.isImage = function() {
    return this.match(new RegExp(/(?:http(s?):)*\.(jpe?g|gif|png)$/i, "i"))
}

String.prototype.isLink = function() {
    return this.match(new RegExp(/(http(s?):|www).*?/, "gi"))
}

String.prototype.normalizeSpaces = function() {
    return this.replace(new RegExp(/(^ +| +$|  +)/gi, "gi"), " ")
}

String.prototype.textOnly = function() {
    return this.replace(new RegExp(/[^a-zA-Z ]/gi, "gi"), "")
}

String.prototype.chatCharsOnly = function() {
    return this.replace(new RegExp(/[^a-zA-Z .,!?]/gi, "gi"), "")
}

String.prototype.removeQuotes = function() {
    return this.replace(new RegExp(/"/gi, "gi"), "")
}

String.prototype.removePrefix = function() {
    return this.replace(new RegExp(config.prefix, "i"), "")
}

String.prototype.replaceFancyQuotes = function() {
    return this.replace(/[“”„]/g, "\"")
        .replace(/[‘’‚‛]/g, "'")
}

String.prototype.replaceAt = function(index, replacement) {
    return this.substring(0, index) + replacement + this.substring(index + replacement.length)
}

Object.defineProperty(Array.prototype, "pickRandom", {
    enumerable: false,
    value: function() {
        return this[bot.logic.randomBetween(0, this.length - 1)]
    }
})
