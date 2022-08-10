class Logic {
    constructor() { }

    levenshtein(a, b) {
        if (a.length == 0) return b.length
        if (b.length == 0) return a.length

        var matrix = []

        for (var i = 0; i <= b.length; i++)
            matrix[i] = [i]
        for (var j = 0; j <= a.length; j++)
            matrix[0][j] = j

        for (i = 1; i <= b.length; i++) {
            for (j = 1; j <= a.length; j++) {
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

    randomBetween = function (min, max) {
        return Math.floor(Math.random() * (max - min + 1) + min)
    }
}

String.prototype.capitalize = function () {
    return this.charAt(0).toUpperCase() + this.slice(1).toLocaleLowerCase()
}

String.prototype.isImage = function () {
    return this.match(new RegExp(/(?:http(s?):)*\.(jpe?g|gif|png)$/i, "i"))
}

String.prototype.isLink = function () {
    return this.match(new RegExp(/(http(s?):|www).*?/, "gi"))
}

String.prototype.normalizeSpaces = function () {
    return this.replace(new RegExp(/(^ +| +$|  +)/gi, "gi"), ' ')
}

String.prototype.textOnly = function () {
    return this.replace(new RegExp(/[^a-zA-Z ]/gi, "gi"), '')
}

String.prototype.chatCharsOnly = function () {
    return this.replace(new RegExp(/[^a-zA-Z .,!?]/gi, "gi"), '')
}

String.prototype.removeQuotes = function () {
    return this.replace(new RegExp(/"/gi, "gi"), '')
}

String.prototype.replaceFancyQuotes = function () {
    var str = this.valueOf()
    str = str.replace(new RegExp(/(“|”)/gi, "gi"), '"')
    return str.replace(new RegExp(/(`|‘|’)/gi, "gi"), "'")
}

String.prototype.replaceAt = function (index, replacement) {
    return this.substr(0, index) + replacement + this.substr(index + replacement.length)
}

Object.defineProperty(Array.prototype, "pickRandom", {
    enumerable: false,
    value: function (array) { return this[logic.randomBetween(0, this.length - 1)] }
})

process.on('exit', function () {
    logger.info(`=== Bot shutting down, goodbye ===`)
})

process.on('SIGINT', function () {
    logger.info(`=== Bot forced to shut down, goodbye ===`)
})

process.on('uncaughtException', function (error) {
    logger.error(`Uncaught error "${error.message}" STACK: "${error.stack}"`)
})


module.exports = new Logic()