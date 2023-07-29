const config = require("config.json")
const bot = require("systems/bot.js")
const logger = require("systems/logger.js")

class Logic {
    constructor() { }

    levenshtein(a, b) {
        if (a.length == 0) return b.length
        if (b.length == 0) return a.length

        const matrix = []

        for (let i = 0; i <= b.length; i++)
            matrix[i] = [i]
        for (let j = 0; j <= a.length; j++)
            matrix[0][j] = j

        for (var i = 1; i <= b.length; i++) {
            for (var j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1]
                } else {
                    matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                        Math.min(matrix[i][j - 1] + 1, // insertion
                            matrix[i - 1][j] + 1)) // deletion
                }
            }
        }

        return matrix[b.length][a.length]
    }

    randomBetween = function(min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }

    findClosestMatchInList(word, wordList) {
        if (word == 0) return ""

        if (Array.isArray(wordList)) {
            const oldWordList = wordList
            wordList = {}
            oldWordList.forEach((item) => {
                wordList[item] = 1
            })
        }

        word = word.toLowerCase()
        let closestMatch = ""
        let difference = Number.MAX_VALUE
        let chosenAmount = 0

        for (const [wordlistword, wordlistamount] of Object.entries(wordList)) {
            const currentdifference = bot.logic.levenshtein(word, wordlistword)
            if (currentdifference < difference) {
                difference = currentdifference
                closestMatch = wordlistword
                chosenAmount = wordlistamount
            } else if (currentdifference == difference) {
                if (wordlistamount < chosenAmount) {
                    difference = currentdifference
                    closestMatch = wordlistword
                    chosenAmount = wordlistamount
                }
            }
        }
        return closestMatch
    }
}

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
    let str = this.valueOf()
    str = str.replace(new RegExp(/(“|”|„)/gi, "gi"), "\"")
    return str.replace(new RegExp(/(`|‘|’)/gi, "gi"), "'")
}

String.prototype.replaceAt = function(index, replacement) {
    return this.substring(0, index) + replacement + this.substring(index + replacement.length)
}

Object.defineProperty(Array.prototype, "pickRandom", {
    enumerable: false,
    value: function() { return this[bot.logic.randomBetween(0, this.length - 1)] }
})

process.on("exit", function() {
    logger.info("=== Bot shutting down, goodbye ===")
})

process.on("SIGINT", function() {
    logger.info("=== Bot forced to shut down, goodbye ===")
})

process.on("uncaughtException", function(error) {
    if (bot.command.commandList.get())
        bot.message.reply(bot.command.commandList.get(), "An error occured, this is probably your fault!")

    logger.error(`Uncaught error "${error.message}"\n === STACK === \n"${error.stack}"`)
})

// handle unhandled rejections
process.on("unhandledRejection", function(error) {
    logger.error(`Unhandled rejection "${error.message}"\n === STACK === \n"${error.stack}"`)
})

module.exports = new Logic()