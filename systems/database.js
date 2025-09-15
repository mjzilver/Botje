const { Client } = require("pg")

const logger = require("./logger")
const { config } = require("./settings")

class Database {
    constructor() {
        this.client = new Client({
            user: config.db.user,
            host: config.db.host,
            database: config.db.database,
            password: config.db.password,
            port: config.db.port,
        })

        this.client.connect().then(() => {
            this.initializeDatabase()
            logger.startup("Postgres Database loaded")
        }).catch(e => {
            logger.error(`Could not connect to database: ${e}`)
        })
    }

    async initializeDatabase() {
        await this.client.query("CREATE TABLE IF NOT EXISTS images (link text PRIMARY KEY, sub text)")
        await this.client.query(`CREATE TABLE IF NOT EXISTS messages 
            (id bigint, user_id bigint, user_name text, message text, datetime bigint, channel_id bigint, server_id bigint, PRIMARY KEY(id))`)
        await this.client.query("CREATE TABLE IF NOT EXISTS colors (x integer, y integer, red integer, green integer, blue integer, PRIMARY KEY(x,y))")
        await this.client.query("CREATE TABLE IF NOT EXISTS command_calls (call_id bigint, reply_id bigint NULL, timestamp bigint, PRIMARY KEY(call_id))")
    }

    query(selectSQL, parameters = [], callback) {
        this.client.query(selectSQL, parameters, (err, result) => {
            if (err) {
                logger.error(selectSQL)
                logger.error(err.stack)
            } else {
                callback(result.rows)
            }
        })
    }

    async insert(selectSQL, parameters = [], callback = null) {
        this.client.query(selectSQL, parameters, err => {
            if (err) {
                logger.error(err.stack)
                logger.error(selectSQL)
            } else {
                if (callback)
                    callback()
            }
        })
    }

    storeMessage(message) {
        if (message.cleanContent !== "" && message.guild && !message.author.bot && !message.content.match(new RegExp(config.prefix, "i")))
            message.guild.members.fetch(message.author.id).then(() => {
                this.insertMessage(message)
            }).catch(() => {
                // person is not a member (has left the server)
            })
    }

    async updateMessage(message) {
        this.client.query("UPDATE messages SET message = $1 WHERE id = $2::bigint",
            [message.cleanContent, message.id])
            .catch(err => {
                logger.error(`Failed to update: ${message.content} posted by ${message.author.username}`)
                logger.error(err.stack)
            })
    }

    async insertMessage(message) {
        this.client.query("INSERT INTO messages (id, user_id, user_name, message, channel_id, server_id, datetime) VALUES ($1::bigint, $2::bigint, $3, $4, $5::bigint, $6::bigint, $7::bigint) ON CONFLICT (id) DO NOTHING",
            [message.id, message.author.id, message.author.username, message.cleanContent, message.channel.id, message.guild.id, message.createdAt.getTime()])
            .catch(err => {
                logger.error(`Failed to insert: ${message.content} posted by ${message.author.username}`)
                logger.error(err.stack)
            })
    }
}

module.exports = new Database()
