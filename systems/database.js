const { Pool } = require("pg")

const logger = require("./logger")
const { config } = require("./settings")

class Database {
    constructor() {
        this.pool = new Pool({
            user: config.db.user,
            host: config.db.host,
            database: config.db.database,
            password: config.db.password,
            port: config.db.port,
        })

        this.pool.connect()
            .then(client => {
                this.initializeDatabase()
                logger.startup("Postgres Database loaded")
                client.release()
            })
            .catch(e => {
                logger.error(`Could not connect to database: ${e}`)
            })
    }

    async initializeDatabase() {
        await this.pool.query("CREATE TABLE IF NOT EXISTS images (link text PRIMARY KEY, sub text)")
        await this.pool.query(`CREATE TABLE IF NOT EXISTS messages 
      (id bigint, user_id bigint, user_name text, message text, datetime bigint, channel_id bigint, server_id bigint, PRIMARY KEY(id))`)
        await this.pool.query("CREATE TABLE IF NOT EXISTS colors (x integer, y integer, red integer, green integer, blue integer, PRIMARY KEY(x,y))")
        await this.pool.query("CREATE TABLE IF NOT EXISTS command_calls (call_id bigint, reply_id bigint NULL, timestamp bigint, PRIMARY KEY(call_id))")
    }

    query(selectQuery, parameters = [], callback) {
        const startTime = performance.now()

        this.pool.query(selectQuery, parameters, (err, result) => {
            const endTime = performance.now()
            const duration = endTime - startTime

            logger.debug(`Query executed in ${duration.toFixed(2)} ms\nSQL: ${selectQuery}`)

            if (err) {
                logger.error(selectQuery)
                logger.error(err.stack)
            } else {
                callback(result.rows)
            }
        })
    }

    async insert(insertQuery, parameters = [], callback = null) {
        const startTime = performance.now()

        this.pool.query(insertQuery, parameters, err => {
            const endTime = performance.now()
            const duration = endTime - startTime

            logger.debug(`Query executed in ${duration.toFixed(2)} ms\nSQL: ${insertQuery}`)

            if (err) {
                logger.error(err.stack)
                logger.error(insertQuery)
            } else {
                if (callback) callback()
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
        this.pool.query("UPDATE messages SET message = $1 WHERE id = $2::bigint",
            [message.cleanContent, message.id])
            .catch(err => {
                logger.error(`Failed to update: ${message.content} posted by ${message.author.username}`)
                logger.error(err.stack)
            })
    }

    async insertMessage(message) {
        this.pool.query("INSERT INTO messages (id, user_id, user_name, message, channel_id, server_id, datetime) VALUES ($1::bigint, $2::bigint, $3, $4, $5::bigint, $6::bigint, $7::bigint) ON CONFLICT (id) DO NOTHING",
            [message.id, message.author.id, message.author.username, message.cleanContent, message.channel.id, message.guild.id, message.createdAt.getTime()])
            .catch(err => {
                logger.error(`Failed to insert: ${message.content} posted by ${message.author.username}`)
                logger.error(err.stack)
            })
    }
}

module.exports = new Database()
