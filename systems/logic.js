module.exports =  class Logic {
    constructor() { }

    levenshtein(a, b) {
        if (a.length === 0) return b.length
        if (b.length === 0) return a.length

        const matrix = []

        for (let i = 0; i <= b.length; i++)
            matrix[i] = [i]
        for (let j = 0; j <= a.length; j++)
            matrix[0][j] = j

        for (var i = 1; i <= b.length; i++) {
            for (var j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) === a.charAt(j - 1)) {
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
        if (word === 0) return ""

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
            const currentdifference = this.levenshtein(word, wordlistword)
            if (currentdifference < difference) {
                difference = currentdifference
                closestMatch = wordlistword
                chosenAmount = wordlistamount
            } else if (currentdifference === difference) {
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