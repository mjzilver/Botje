const fs = require("fs")

const database = require("./database")
const logger = require("./logger")

module.exports = class Dictionary {
    constructor() {
        this.words = []
        this.wordsPath = "json/words.json"

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

    async generateWordsFile() {
        const selectSQL = `SELECT LOWER(message) as message
        FROM messages
        WHERE message NOT LIKE '%<%' AND message NOT LIKE ''`

        const wordHolder = {}

        try {
            const rows = await database.query(selectSQL, [])
            for (let i = 0; i < rows.length; i++) {
                const words = rows[i]["message"].split(/\s+/)

                for (let j = 0; j < words.length; j++)
                    if (!wordHolder[words[j]])
                        wordHolder[words[j]] = 1
                    else
                        wordHolder[words[j]]++
            }

            for (const word in wordHolder)
                this.words.push([word, wordHolder[word]])

            this.words.sort((a, b) => {
                return b[1] - a[1]
            })
            const shortList = this.words.slice(0, 200)

            fs.writeFile(this.wordsPath, JSON.stringify(shortList), err => {
                if (err)
                    logger.error(err)
            })
        } catch (err) {
            logger.error(err)
        }
    }

    getWordsByLength(length) {
        const result = []

        for (const i in this.words) {
            let processedWord = this.words[i][0]
            const { textOnly } = require("./stringHelpers")
            processedWord = textOnly(processedWord)
            if (processedWord.length === length && this.words[i][1] > 20)
                result.push(processedWord)
        }

        return result
    }

    getNonSelectorsRegex(amount = 100) {
        let nonSelectorsRegex = ""
        const max = (this.words.length < amount) ? this.words.length : amount
        for (let i = 0; i < max; i++) {
            nonSelectorsRegex += this.words[i][0]
            if (i !== max - 1)
                nonSelectorsRegex += "|"
        }
        return new RegExp(`\\b((${nonSelectorsRegex})\\s)\\b`, "gmi")
    }
}