class NonSelector {
    constructor() {
        this.nonSelectors = []
        this.nonSelectorPath = './assets/words.json'
        this.initializeNonselectors()
    }
    initializeNonselectors() {
        if (fs.existsSync(this.nonSelectorPath)) {
            this.nonSelectors = JSON.parse(fs.readFileSync(this.nonSelectorPath))
        } else {
            this.generateNonselectors()
            logger.console('NonSelector JSON not found, generating new file')
        }
    }

    generateNonselectors() {
        let selectSQL = `SELECT LOWER(message) as message
        FROM messages
        WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND message NOT LIKE ""`

        var wordHolder = {}

        database.db.all(selectSQL, [], (err, rows) => {
            for (var i = 0; i < rows.length; i++) {
                var words = rows[i]['message'].split(/\s+/)

                for (let j = 0; j < words.length; j++) {
                    if (!wordHolder[words[j]])
                        wordHolder[words[j]] = 1
                    else
                        wordHolder[words[j]]++
                }
            }

            for (var word in wordHolder) {
                this.nonSelectors.push([word, wordHolder[word]]);
            }
            this.nonSelectors.sort(function (a, b) {
                return b[1] - a[1]
            })

            fs.writeFile(this.nonSelectorPath, JSON.stringify(this.nonSelectors), function (err) {
                if (err)
                    logger.error(err)
            })
        })
    }

    getNonSelectors(amount = 100) {
        var returnArray = [...this.nonSelectors]
        returnArray.length = amount
        return returnArray
    }

    getNonSelectorsRegex(amount = 100) {
        var nonSelectorsRegex = ''
        var max = (this.nonSelectors.length < amount) ? this.nonSelectors.length : amount
        for (var i = 0; i < max; i++) {
            nonSelectorsRegex += this.nonSelectors[i][0] 
            if (i != max - 1)
                nonSelectorsRegex += '|'
        }
        return new RegExp(`\\b((${nonSelectorsRegex})\\s)\\b`, "gmi")
    }
}

module.exports = new NonSelector()