class Spellcheck {
    constructor() {
        this.wordList = {}
        var earliest = new Date()
        earliest.setMonth(earliest.getMonth() - 3)

        const selectSQL = `SELECT LOWER(message) AS message, COUNT(*) AS amount 
        FROM messages 
        WHERE date < ${earliest.getTime()}
        GROUP BY message 
        ORDER BY amount DESC `

        database.db.all(selectSQL, [], (err, rows) => {
            if (err) {
                throw err
            } else {
                rows.forEach(row => {
                    row.message.split(' ').forEach(word => {
                        if (!(word in this.wordList)) {
                            this.wordList[word] = 1
                        } else {
                            this.wordList[word] = this.wordList[word] + 1
                        }
                    })
                })
            }
        })
    }

    checkSentence(sentence) {
        var words = []
        var mistakes = 0

        for (var word of sentence.split(' ')) {
            word = word.textOnly()
            if (this.checkWord(word)) {
                words.push(word)
            } else {
                var result = this.findClosestWord(word)
                mistakes++
                words.push(result)
            }
        }
        return {
            'result': words.join(' '),
            'mistakes': mistakes
        }
    }

    checkWord(word) {
        return word.toLowerCase() in this.wordList
    }

    findClosestWord(word) {
        if (word == 0) return ''

        word = word.toLowerCase()

        var closestMatch = ""
        var difference = Number.MAX_VALUE
        var chosenAmount = 0

        for (const [wordlistword, wordlistamount] of Object.entries(this.wordList)) {
            if (wordlistamount >= 5) {
                var currentdifference = bot.logic.levenshtein(word, wordlistword)
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
        }
        return closestMatch
    }

    findClosestMatchInList(word, wordList) {
        if (word == 0) return ''

        if (Array.isArray(wordList)) {
            var oldWordList = wordList
            wordList = {}
            oldWordList.forEach((item) => {
                wordList[item] = 1
            })
        }

        word = word.toLowerCase()
        var closestMatch = ""
        var difference = Number.MAX_VALUE
        var chosenAmount = 0

        for (const [wordlistword, wordlistamount] of Object.entries(wordList)) {
            var currentdifference = bot.logic.levenshtein(word, wordlistword)
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

module.exports = new Spellcheck()