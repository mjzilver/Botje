class Database {
    constructor() {
        this.sqlite3 = require('sqlite3')
        this.db = new this.sqlite3.Database("./discord.db")

        this.initializeDatabase()
        this.generateNonselectors()
        this.nonSelectors = []
    }

    initializeDatabase() {
        this.db.run(`CREATE TABLE IF NOT EXISTS images (link TEXT PRIMARY KEY, sub TEXT)`)
        this.db.run(`CREATE TABLE IF NOT EXISTS messages (user_id TEXT, user_name TEXT, message TEXT, date TEXT, channel TEXT, server TEXT, PRIMARY KEY(user_id, date, channel))`)
        this.db.run(`CREATE TABLE IF NOT EXISTS colors (x INTEGER, y INTEGER, red INTEGER, green INTEGER, blue INTEGER, PRIMARY KEY(x,y))`)
    }

    generateNonselectors() {
        let selectSQL = `SELECT LOWER(message) as message
        FROM messages
        WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND message NOT LIKE ""`

        var wordHolder = {}

        this.db.all(selectSQL, [], (err, rows) => {
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

            fs.writeFile('./backups/words.json', JSON.stringify(this.nonSelectors), function (err) {
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

    query(selectSQL, parameters = [], callback) {
        database.db.all(selectSQL, parameters, (err, rows) => {
            if (err)
                throw err
            else
                callback(rows)
        })
    }

    storemessage(message) {
        if (message.guild && !message.author.bot && !message.content.match(new RegExp(config.prefix, "i")) && !message.content.match(new RegExp("^t!", "i"))) {
            message.guild.members.fetch(message.author.id).then(
                (result) => {
                    this.insertmessage(message)
                },
                (error) => {})
        }
    }

    insertmessage(message) {
        var insert = this.db.prepare('INSERT OR IGNORE INTO messages (user_id, user_name, message, channel, server, date) VALUES (?, ?, ?, ?, ?, ?)',
            [message.author.id, message.author.username, message.cleanContent, message.channel.id, message.guild.id, message.createdAt.getTime()])
        insert.run(function (err) {
            if (err) {
                logger.error(`failed to insert: ${message.content} posted by ${message.author.username}`)
                logger.error(err)
            }
        })
    }
}

module.exports = new Database()