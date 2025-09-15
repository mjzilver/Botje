function levenshtein(a, b) {
    if (a.length === 0) return b.length
    if (b.length === 0) return a.length

    const matrix = []

    for (let i = 0; i <= b.length; i++)
        matrix[i] = [i]
    for (let j = 0; j <= a.length; j++)
        matrix[0][j] = j

    for (let i = 1; i <= b.length; i++)
        for (let j = 1; j <= a.length; j++)
            if (b.charAt(i - 1) === a.charAt(j - 1))
                matrix[i][j] = matrix[i - 1][j - 1]
            else
                matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, // substitution
                    Math.min(matrix[i][j - 1] + 1, // insertion
                        matrix[i - 1][j] + 1)) // deletion

    return matrix[b.length][a.length]
}

function findClosestMatchInList(word, wordList) {
    if (word === 0) return ""

    if (Array.isArray(wordList)) {
        const oldWordList = wordList
        wordList = {}
        oldWordList.forEach(item => {
            wordList[item] = 1
        })
    }

    word = word.toLowerCase()
    let closestMatch = ""
    let difference = Number.MAX_VALUE
    let chosenAmount = 0

    for (const [wordlistword, wordlistamount] of Object.entries(wordList)) {
        const currentdifference = levenshtein(word, wordlistword)
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

function formatUptime(ms) {
    const days = Math.floor(ms / 86400000)
    const hours = Math.floor((ms / 3600000) % 24)
    const minutes = Math.floor((ms / 60000) % 60)
    const seconds = Math.ceil((ms / 1000) % 60)
    return `${days ? `${days} days, ` : ""}${hours ? `${hours} hours, ` : ""}${minutes ? `${minutes} minutes and ` : ""}${seconds} seconds`
}

function randomBetween(min, max) {
    return Math.floor(Math.random() * (max - min + 1) + min)
}

function pickRandomItem(array) {
    if (!Array.isArray(array) || array.length === 0)
        throw new Error("Array must be non-empty to pick a random item")
    return array[randomBetween(0, array.length - 1)]
}

module.exports = {
    levenshtein,
    randomBetween,
    pickRandomItem,
    findClosestMatchInList,
    formatUptime
}