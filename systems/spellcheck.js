class Spellcheck {
    constructor() {
        this.wordList = []

        const selectSQL = `SELECT LOWER(message) AS message, COUNT(*) AS amount 
        FROM messages 
        GROUP BY message 
        HAVING amount > 5
        ORDER BY amount DESC `

        database.db.all(selectSQL, [], (err, rows) => {
            if (err) {
                throw err
            } else {
                rows.forEach(row => {
                    row.message.split(' ').forEach(word => {
                        this.wordList.push(word)
                    })
                });
            }
        })
    }

    checkWord(word) {
        return this.wordList.includes(word.toLowerCase())
    }

    findClosestWord(word) {
        if (word == 0) return ''

        word = word.toLowerCase()

        var closestMatch = ""
        var difference = Number.MAX_VALUE

        for (const wordlistword of this.wordList) {
            var currentdifference = this.levenshtein(word, wordlistword)
            if (currentdifference < difference) {
                difference = currentdifference
                closestMatch = wordlistword
            }
        }
        return closestMatch
    }

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
}

module.exports = new Spellcheck()