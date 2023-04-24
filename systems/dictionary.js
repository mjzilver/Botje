let fs = require("fs")
let database = require("./database.js")
let logger = require("./logger.js")

class Dictionary {
    constructor() {
        this.words = []
        this.wordsPath = "./json/words.json"

        if (fs.existsSync(this.wordsPath)) {
            this.loadWordsFromFile()
        } else {
            this.generateWordsFile()
            logger.console("NonSelector JSON not found, generating new file")
        }
    }

    loadWordsFromFile() {
        const stream = fs.createReadStream(this.wordsPath, { encoding: "utf8" })
        let rawData = ""

        stream.on("data", chunk => {
            rawData += chunk
        })

        stream.on("end", () => {
            this.words = JSON.parse(rawData)
        })

        stream.on("error", err => {
            logger.error(err)
        })
    }

    generateWordsFile() {
        let selectSQL = `SELECT LOWER(message) as message
        FROM messages
        WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND message NOT LIKE ""`

        let wordHolder = {}

        database.db.all(selectSQL, [], (err, rows) => {
            for (let i = 0; i < rows.length; i++) {
                let words = rows[i]["message"].split(/\s+/)

                for (let j = 0; j < words.length; j++) {
                    if (!wordHolder[words[j]])
                        wordHolder[words[j]] = 1
                    else
                        wordHolder[words[j]]++
                }
            }

            for (let word in wordHolder) {
                this.words.push([word, wordHolder[word]])
            }
            this.words.sort(function (a, b) {
                return b[1] - a[1]
            })

            fs.writeFile(this.wordsPath, JSON.stringify(this.words), function (err) {
                if (err)
                    logger.error(err)
            })
        })
    }

    getWordsByLength(length) {
        let result = []

        for (let i in this.words) {
            let processedWord = this.words[i][0]
            processedWord = processedWord.textOnly()
            if (processedWord.length == length && this.words[i][1] > 20) {
                result.push(processedWord)
            }
        }

        return result
    }

    getNonSelectorsRegex(amount = 100) {
        let nonSelectorsRegex = ""
        let max = (this.words.length < amount) ? this.words.length : amount
        for (let i = 0; i < max; i++) {
            nonSelectorsRegex += this.words[i][0]
            if (i != max - 1)
                nonSelectorsRegex += "|"
        }
        return new RegExp(`\\b((${nonSelectorsRegex})\\s)\\b`, "gmi")
    }
}

module.exports = new Dictionary()