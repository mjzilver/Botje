let config = require('../config.json')

class Database {
    constructor() {
        this.sqlite3 = require('sqlite3').verbose()
        this.db = new this.sqlite3.Database("./discord.db")

        this.initializeDatabase()
        this.setCacheSize(20000)
    }

    initializeDatabase() {
        this.db.run(`CREATE TABLE IF NOT EXISTS images (link TEXT PRIMARY KEY, sub TEXT)`)
        this.db.run(`CREATE TABLE IF NOT EXISTS messages (id TEXT, user_id TEXT, user_name TEXT, message TEXT, date TEXT, channel TEXT, server TEXT, PRIMARY KEY(text, date))`)
        this.db.run(`CREATE TABLE IF NOT EXISTS colors (x INTEGER, y INTEGER, red INTEGER, green INTEGER, blue INTEGER, PRIMARY KEY(x,y))`)
        this.db.run(`CREATE TABLE IF NOT EXISTS command_calls (call_id TEXT, reply_id TEXT, timestamp TEXT, PRIMARY KEY(call_id))`)
    }

    setCacheSize(cacheSize) {
        this.db.serialize(() => {
            this.db.run(`PRAGMA cache_size = ${cacheSize};`)
        })
    }

    query(selectSQL, parameters = [], callback) {
        this.db.all(selectSQL, parameters, (err, rows) => {
            if (err)
                throw err
            else
                callback(rows)
        })
    }

    storeMessage(message) {
        if (message.cleanContent !== "" && message.guild && !message.author.bot && !message.content.match(new RegExp(config.prefix, "i"))) {
            message.guild.members.fetch(message.author.id).then(
                (result) => {
                    this.insertMessage(message)
                },
                (error) => { })
        }
    }

    insertMessage(message) {
        let insert = this.db.prepare('INSERT OR IGNORE INTO messages (id, user_id, user_name, message, channel, server, date) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [message.id, message.author.id, message.author.username, message.cleanContent, message.channel.id, message.guild.id, message.createdAt.getTime()])
        insert.run(function (err) {
            if (err) {
                logger.error(`failed to insert: ${message.content} posted by ${message.author.username}`)
                logger.error(err)
            }
        })
    }
}

module.exports = new Database()