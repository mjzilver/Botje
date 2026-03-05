const database = require("./database")
const logger = require("./logger")

module.exports = class Dictionary {
    constructor() {
    }

    async getTopWords(limit = 200) {
        try {
            const rows = await database.query(`
                SELECT w.word, COUNT(wm.message_id) as frequency
                FROM words w
                JOIN word_messages wm ON w.word_id = wm.word_id
                GROUP BY w.word_id, w.word
                ORDER BY frequency DESC
                LIMIT $1
            `, [limit])
            
            return rows.map(row => [row.word, parseInt(row.frequency)])
        } catch (err) {
            logger.error(`Failed to get top words: ${err}`)
            return []
        }
    }

    async getWordsByLength(length, minFrequency = 20) {
        try {
            const { textOnly } = require("./stringHelpers")
            const rows = await database.query(`
                SELECT w.word, COUNT(wm.message_id) as frequency
                FROM words w
                JOIN word_messages wm ON w.word_id = wm.word_id
                GROUP BY w.word_id, w.word
                HAVING COUNT(wm.message_id) > $1
                ORDER BY frequency DESC
            `, [minFrequency])
            
            const result = []
            for (const row of rows) {
                const processedWord = textOnly(row.word)
                if (processedWord.length === length) {
                    result.push(processedWord)
                }
            }
            
            return result
        } catch (err) {
            logger.error(`Failed to get words by length: ${err}`)
            return []
        }
    }

    async getNonSelectorsRegex(amount = 100) {
        try {
            const topWords = await this.getTopWords(amount)
            const words = topWords.map(wordPair => wordPair[0])
            
            if (words.length === 0) return new RegExp("", "gmi")
            
            const nonSelectorsRegex = words.join("|")
            return new RegExp(`\\b((${nonSelectorsRegex})\\s)\\b`, "gmi")
        } catch (err) {
            logger.error(`Failed to generate non-selectors regex: ${err}`)
            return new RegExp("", "gmi")
        }
    }

    async getWordFrequency(word) {
        try {
            const rows = await database.query(`
                SELECT COUNT(wm.message_id) as frequency
                FROM words w
                JOIN word_messages wm ON w.word_id = wm.word_id
                WHERE w.word = $1
            `, [word.toLowerCase()])
            
            return rows[0] ? parseInt(rows[0].frequency) : 0
        } catch (err) {
            logger.error(`Failed to get word frequency: ${err}`)
            return 0
        }
    }

    async getMessagesContainingWords(words, limit = 10) {
        try {
            const placeholders = words.map((_, i) => `$${i + 1}`).join(', ')
            const rows = await database.query(`
                SELECT DISTINCT m.message, m.id
                FROM messages m
                JOIN word_messages wm ON m.id = wm.message_id
                JOIN words w ON wm.word_id = w.word_id
                WHERE w.word IN (${placeholders})
                LIMIT $${words.length + 1}
            `, [...words.map(w => w.toLowerCase()), limit])
            
            return rows
        } catch (err) {
            logger.error(`Failed to get messages containing words: ${err}`)
            return []
        }
    }
}