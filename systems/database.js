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

        this.initialize()
    }

    async initialize() {
        try {
            await this.initializeDatabase()
            logger.startup("Postgres Database loaded")
        } catch (e) {
            logger.error(`Could not initialize database: ${e}`)
        }
    }

    async initializeDatabase() {
        await this.query("CREATE TABLE IF NOT EXISTS images (link text PRIMARY KEY, sub text)")

        await this.query(`
            CREATE TABLE IF NOT EXISTS messages (
                id bigint PRIMARY KEY,
                user_id bigint,
                message text,
                datetime bigint,
                channel_id bigint,
                server_id bigint,
                reply_to bigint NULL
            )
        `)

        await this.query(`
            CREATE TABLE IF NOT EXISTS command_calls (
                call_id bigint PRIMARY KEY,
                reply_id bigint NULL,
                timestamp bigint
            )
        `)

        await this.query(`
            CREATE TABLE IF NOT EXISTS reactions (
                message_id bigint,
                user_id bigint,
                emoji text,
                timestamp bigint,
                PRIMARY KEY(message_id, user_id, emoji)
            )
        `)

        await this.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id bigint PRIMARY KEY
            )
        `)

        await this.query(`
            CREATE TABLE IF NOT EXISTS usernames (
                user_id bigint,
                server_id bigint,
                user_name text,
                timestamp bigint,
                PRIMARY KEY(user_id, server_id, user_name)
            )
        `)
    }

    async query(sql, params = []) {
        try {
            const result = await this.pool.query(sql, params)
            return result.rows
        } catch (err) {
            logger.error(`SQL Error:\n${sql}\n${err}`)
            throw err
        }
    }

    async getCurrentUsername(userId, serverId) {
        const rows = await this.query(
            `SELECT user_name FROM usernames
             WHERE user_id = $1 AND server_id = $2
             ORDER BY timestamp DESC
             LIMIT 1`,
            [userId, serverId]
        )

        return rows.length ? rows[0].user_name : null
    }

    async getCount(selectQuery, parameters = []) {
        const countQuery = `SELECT COUNT(*) AS count FROM (${selectQuery}) AS sub`
        const rows = await this.query(countQuery, parameters)
        return parseInt(rows[0].count, 10)
    }

    async queryRandomMessage(selectQuery, parameters = []) {
        const count = await this.getCount(selectQuery, parameters)
        if (count === 0) return []

        const offset = Math.floor(Math.random() * count)
        const queryWithOffset = `${selectQuery} LIMIT 1 OFFSET $${parameters.length + 1}`

        return await this.query(queryWithOffset, [...parameters, offset])
    }

    async insert(sql, params = []) {
        await this.query(sql, params)
    }

    async ensureUserExists(user, serverId, displayName = null) {
        await this.query(
            "INSERT INTO users (user_id) VALUES ($1::bigint) ON CONFLICT DO NOTHING",
            [user.id]
        )

        if (serverId && displayName)
            await this.query(
                `INSERT INTO usernames (user_id, server_id, user_name, timestamp)
                 VALUES ($1::bigint, $2::bigint, $3, $4::bigint)
                 ON CONFLICT DO NOTHING`,
                [user.id, serverId, displayName, Date.now()]
            )
    }

    async storeMessage(message) {
        if (
            message.cleanContent === ""
            || !message.guild
            || message.author.bot
            || message.content.match(new RegExp(config.prefix, "i"))
        ) return

        try {
            const member = await message.guild.members.fetch(message.author.id)

            await this.ensureUserExists(
                message.author,
                message.guild.id,
                member.displayName
            )

            await this.insertMessage(message)
        } catch {
            logger.info(`Failed to store message: ${message.content} (likely left server) Author: ${message.author.tag}`)
        }
    }

    async updateMessage(message) {
        try {
            await this.query(
                "UPDATE messages SET message = $1 WHERE id = $2::bigint",
                [message.cleanContent, message.id]
            )
        } catch {
            logger.error(`Failed to update: ${message.content}`)
        }
    }

    async insertReaction(reaction) {
        let users = reaction.users.cache

        if (users.size === 0)
            try {
                users = await reaction.users.fetch()
            } catch {
                logger.error("Failed to fetch users for reaction")
                return
            }

        for (const user of users.values())
            try {
                await this.query(
                    `INSERT INTO reactions (message_id, user_id, emoji, timestamp)
                     VALUES ($1::bigint, $2::bigint, $3, $4::bigint)
                     ON CONFLICT DO NOTHING`,
                    [reaction.message.id, user.id, reaction.emoji.name, Date.now()]
                )
            } catch {
                logger.error("Failed to store reaction")
            }
    }

    async insertMessage(message) {
        let replyTo = null

        if (message.reference)
            try {
                const repliedMessage = await message.channel.messages.fetch(
                    message.reference.messageId
                )
                replyTo = repliedMessage?.id ?? null
            } catch {
                logger.error("Failed to fetch replied message")
            }

        await this.query(
            `INSERT INTO messages
            (id, user_id, message, channel_id, server_id, datetime, reply_to)
            VALUES ($1::bigint, $2::bigint, $3, $4::bigint, $5::bigint, $6::bigint, $7::bigint)
            ON CONFLICT (id) DO UPDATE SET reply_to = EXCLUDED.reply_to`,
            [
                message.id,
                message.author.id,
                message.cleanContent,
                message.channel.id,
                message.guild.id,
                message.createdAt.getTime(),
                replyTo
            ]
        )

        if (message.reactions.cache.size > 0)
            for (const reaction of message.reactions.cache.values())
                await this.insertReaction(reaction)
    }
}

module.exports = new Database()
