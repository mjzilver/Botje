const { Pool } = require("pg")
const format = require("pg-format")

const logger = require("./logger")
const { config } = require("./settings")

const DEBUG_SQL = true

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

        await this.query(`
            CREATE TABLE IF NOT EXISTS words (
                word_id SERIAL PRIMARY KEY,
                word text UNIQUE NOT NULL
            )
        `)

        await this.query(`
            CREATE TABLE IF NOT EXISTS word_messages (
                word_id int,
                message_id bigint,
                PRIMARY KEY(word_id, message_id)
            )
        `)
    }

    async query(sql, params = []) {
        let start; let end
        if (DEBUG_SQL)
            start = Date.now()

        try {
            const result = await this.pool.query(sql, params)
            if (DEBUG_SQL) {
                end = Date.now()
                const duration = end - start
                if (duration > 1000) {
                    let interpolated
                    try {
                        interpolated = format.withArray(sql.replace(/\$(\d+)/g, "%L"), params)
                    } catch (e) {
                        interpolated = `[pg-format error] ${e.message}`
                    }
                    logger.warn(`[Slow Query] (${duration} ms) ${interpolated}`)
                }
            }
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
            await this.insertWords(message.id, message.cleanContent)
        } catch {
            logger.info(`Failed to store message: ${message.cleanContent} (likely left server) Author: ${message.author.tag}`)
        }
    }

    async updateMessage(message) {
        try {
            await this.query(
                "UPDATE messages SET message = $1 WHERE id = $2::bigint",
                [message.cleanContent, message.id]
            )
        } catch {
            logger.error(`Failed to update: ${message.cleanContent}`)
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

    async insertWords(id, content) {
        const words = content
            .toLowerCase()
            .split(/\s+/)
            .filter(word => word.length > 0)

        for (const word of words)
            try {
                const result = await this.query(
                    "INSERT INTO words (word) VALUES ($1) ON CONFLICT (word) DO UPDATE SET word = EXCLUDED.word RETURNING word_id",
                    [word]
                )
                const wordId = result[0].word_id

                await this.query(
                    "INSERT INTO word_messages (word_id, message_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
                    [wordId, id]
                )
            } catch {
                logger.error(`Failed to store word: ${word}`)
            }
    }

    async bulkInsertWords(messages) {
        const wordSet = new Set()
        const relations = []

        for (const msg of messages) {
            const words = msg.message
                .toLowerCase()
                .split(/\s+/)
                .filter(w => w.length > 1)

            const uniqueWords = [...new Set(words)]

            for (const word of uniqueWords) {
                wordSet.add(word)
                relations.push([word, msg.id])
            }
        }

        const uniqueWords = [...wordSet]
        if (uniqueWords.length === 0) return

        await this.query(`
            INSERT INTO words(word)
            SELECT UNNEST($1::text[])
            ON CONFLICT DO NOTHING `,
        [uniqueWords]
        )

        const rows = await this.query(
            "SELECT word_id, word FROM words WHERE word = ANY($1)",
            [uniqueWords]
        )

        const wordMap = new Map()
        for (const row of rows)
            wordMap.set(row.word, row.word_id)

        const wordIds = []
        const messageIds = []

        for (const [word, messageId] of relations) {
            const id = wordMap.get(word)
            if (!id) continue

            wordIds.push(id)
            messageIds.push(messageId)
        }

        const chunkSize = 30000
        for (let i = 0; i < wordIds.length; i += chunkSize) {
            const wordChunk = wordIds.slice(i, i + chunkSize)
            const msgChunk = messageIds.slice(i, i + chunkSize)

            await this.query(`
                INSERT INTO word_messages(word_id, message_id)
                SELECT * FROM UNNEST($1::int[], $2::bigint[])
                ON CONFLICT DO NOTHING `,
            [wordChunk, msgChunk]
            )
        }
    }
}

module.exports = new Database()
