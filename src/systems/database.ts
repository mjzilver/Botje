import { Pool, DatabaseError } from "pg";
import type { QueryResultRow } from "pg";
import format from "pg-format";
import type { ILogger } from "./logger";
import type { BotConfig } from "../interfaces/config";
import { isGuildMessage } from "../interfaces/discord";
import type { BotMessage, BotReaction, GuildBotMessage } from "../interfaces/discord";
import { toError } from "./utils";

export type SqlParam = string | number | boolean | null | Date | Buffer;

export interface ReminderRow {
    id: number;
    user_id: string;
    channel_id: string;
    reminder_message: string;
    trigger_at: number;
}

export interface IDatabase {
    query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: SqlParam[]): Promise<T[]>;
    insert(sql: string, params?: SqlParam[]): Promise<void>;
    getCount(selectQuery: string, parameters?: SqlParam[]): Promise<number>;
    queryRandomMessage<T extends QueryResultRow = QueryResultRow>(
        selectQuery: string,
        parameters?: SqlParam[],
    ): Promise<T[]>;
    ensureUserExists(user: { id: string }, serverId: string | null, displayName?: string | null): Promise<void>;
    storeMessage(message: BotMessage): Promise<void>;
    updateMessage(message: BotMessage): Promise<void>;
    insertMessage(message: GuildBotMessage): Promise<void>;
    insertReaction(reaction: BotReaction): Promise<void>;
    getCurrentUsername(userId: string, serverId: string): Promise<string | null>;
    insertReminder(userId: string, channelId: string, reminderMessage: string, triggerAt: number): Promise<number>;
    deleteReminder(id: number): Promise<void>;
    getPendingReminders(): Promise<ReminderRow[]>;
}

const DEBUG_SQL = process.env.DEBUG_SQL === "1";

export class Database implements IDatabase {
    private pool: Pool;
    private logger: ILogger;
    private config: Pick<BotConfig, "prefix">;
    constructor(pool: Pool, logger: ILogger, config: Pick<BotConfig, "prefix">) {
        this.pool = pool;
        this.logger = logger;
        this.config = config;
    }

    private formatSqlParams(params: SqlParam[]): string {
        const normalizedParams = params.map((param) => {
            if (param instanceof Date) return param.toISOString();
            if (Buffer.isBuffer(param)) return `<Buffer length=${param.length}>`;

            return param;
        });

        return JSON.stringify(normalizedParams);
    }

    private formatQueryErrorDetails(err: Error, params: SqlParam[]): string {
        const base = `${err.message}\nparams=${this.formatSqlParams(params)}`;
        if (!(err instanceof DatabaseError)) return base;

        const { code, detail, hint, where, table, column, constraint, routine } = err;
        const pg = Object.entries({ code, detail, hint, where, table, column, constraint, routine })
            .filter(([, v]) => v)
            .map(([k, v]) => `${k}=${v}`)
            .join("\n");

        return pg ? `${base}\n${pg}` : base;
    }

    async initialize(): Promise<void> {
        try {
            await this.initializeSchema();
            this.logger.startup("Postgres Database loaded");
        } catch (e) {
            this.logger.error(`Could not initialize database: ${e}`);
            throw e;
        }
    }

    private async initializeSchema(): Promise<void> {
        await this.query("CREATE EXTENSION IF NOT EXISTS pg_trgm");
        await this.query("CREATE TABLE IF NOT EXISTS images (link text PRIMARY KEY, sub text)");
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
        `);
        await this.query(`
            CREATE INDEX IF NOT EXISTS idx_message_trgm ON messages 
            USING gin(message gin_trgm_ops)
        `);
        await this.query(`
            CREATE INDEX IF NOT EXISTS idx_messages_server_user ON messages (server_id, user_id)
        `);
        await this.query(`
            CREATE INDEX IF NOT EXISTS idx_messages_server_datetime ON messages (server_id, datetime)
        `);
        await this.query(`
            CREATE INDEX IF NOT EXISTS idx_messages_reply_to ON messages (reply_to)
        `);
        await this.query(`
            CREATE TABLE IF NOT EXISTS command_calls (
                call_id bigint PRIMARY KEY,
                reply_id bigint NULL,
                timestamp bigint
            )
        `);
        await this.query(`
            CREATE TABLE IF NOT EXISTS reactions (
                message_id bigint,
                user_id bigint,
                emoji text,
                timestamp bigint,
                PRIMARY KEY(message_id, user_id, emoji)
            )
        `);
        await this.query(`
            CREATE INDEX IF NOT EXISTS idx_reactions_user_message ON reactions (user_id, message_id)
        `);
        await this.query(`
            CREATE INDEX IF NOT EXISTS idx_reactions_message_emoji ON reactions (message_id, emoji)
        `);
        await this.query(`
            CREATE TABLE IF NOT EXISTS users (
                user_id bigint PRIMARY KEY
            )
        `);
        await this.query(`
            CREATE TABLE IF NOT EXISTS usernames (
                user_id bigint,
                server_id bigint,
                user_name text,
                timestamp bigint,
                PRIMARY KEY(user_id, server_id, user_name)
            )
        `);
        await this.query(`
            CREATE TABLE IF NOT EXISTS reminders (
                id serial PRIMARY KEY,
                user_id bigint NOT NULL,
                channel_id bigint NOT NULL,
                reminder_message text NOT NULL,
                trigger_at bigint NOT NULL
            )
        `);
    }

    async query<T extends QueryResultRow = QueryResultRow>(sql: string, params: SqlParam[] = []): Promise<T[]> {
        let start: number | undefined;
        if (DEBUG_SQL) start = Date.now();
        try {
            const result = await this.pool.query(sql, params);
            if (DEBUG_SQL && start !== undefined) {
                const duration = Date.now() - start;
                if (duration > 1000) {
                    let interpolated: string;
                    try {
                        interpolated = format.withArray(sql.replace(/\$(\d+)/g, "%L"), params);
                    } catch (e) {
                        interpolated = `[pg-format error] ${toError(e).message}`;
                    }

                    this.logger.warn(`[Slow Query] (${duration} ms) ${interpolated}`);
                }
            }

            return result.rows as T[];
        } catch (err) {
            this.logger.error(`SQL Error:\n${sql}\n${this.formatQueryErrorDetails(toError(err), params)}`);
            throw err;
        }
    }

    async insert(sql: string, params: SqlParam[] = []): Promise<void> {
        await this.query(sql, params);
    }

    async ensureUserExists(
        user: {
            id: string;
        },
        serverId: string | null,
        displayName: string | null = null,
    ): Promise<void> {
        await this.query("INSERT INTO users (user_id) VALUES ($1::bigint) ON CONFLICT DO NOTHING", [user.id]);
        if (serverId && displayName)
            await this.query(
                `INSERT INTO usernames (user_id, server_id, user_name, timestamp)
                 VALUES ($1::bigint, $2::bigint, $3, $4::bigint)
                 ON CONFLICT DO NOTHING`,
                [user.id, serverId, displayName, Date.now()],
            );
    }

    async getCurrentUsername(userId: string, serverId: string): Promise<string | null> {
        const rows = await this.query<{
            user_name: string;
        }>(
            `SELECT user_name FROM usernames
             WHERE user_id = $1 AND server_id = $2
             ORDER BY timestamp DESC
             LIMIT 1`,
            [userId, serverId],
        );

        return rows.length ? rows[0].user_name : null;
    }

    async getCount(selectQuery: string, parameters: SqlParam[] = []): Promise<number> {
        const countQuery = `SELECT COUNT(*) AS count FROM (${selectQuery}) AS sub`;
        const rows = await this.query<{
            count: string;
        }>(countQuery, parameters);

        return parseInt(rows[0].count, 10);
    }

    async queryRandomMessage<T extends QueryResultRow = QueryResultRow>(
        selectQuery: string,
        parameters: SqlParam[] = [],
    ): Promise<T[]> {
        const count = await this.getCount(selectQuery, parameters);
        if (count === 0) return [];
        const offset = Math.floor(Math.random() * count);
        const queryWithOffset = `${selectQuery} LIMIT 1 OFFSET $${parameters.length + 1}`;

        return this.query<T>(queryWithOffset, [...parameters, offset]);
    }

    async storeMessage(message: BotMessage): Promise<void> {
        if (
            message.cleanContent === "" ||
            !isGuildMessage(message) ||
            message.author.bot ||
            message.content.match(new RegExp(this.config.prefix, "i"))
        )
            return;
        let member: { displayName: string };
        try {
            member = await message.guild.members.fetch(message.author.id);
        } catch {
            this.logger.info(
                `Failed to store message: ${message.content} (likely left server) Author: ${message.author.tag}`,
            );

            return;
        }

        await this.ensureUserExists(message.author, message.guild.id, member.displayName);
        await this.insertMessage(message);
    }

    async updateMessage(message: BotMessage): Promise<void> {
        try {
            await this.query("UPDATE messages SET message = $1 WHERE id = $2::bigint", [
                message.cleanContent,
                message.id,
            ]);
        } catch {
            this.logger.error(`Failed to update: ${message.content}`);
        }
    }

    async insertReaction(reaction: BotReaction): Promise<void> {
        let users = reaction.users.cache;
        if (users.size === 0)
            try {
                users = await reaction.users.fetch();
            } catch {
                this.logger.error("Failed to fetch users for reaction");

                return;
            }
        for (const user of users.values()) {
            const emojiName = reaction.emoji.name;
            if (!emojiName) {
                this.logger.warn(
                    `Skipping reaction insert: message_id=${reaction.message.id} user_id=${user.id} reason=missing emoji name`,
                );

                continue;
            }
            try {
                await this.query(
                    `INSERT INTO reactions (message_id, user_id, emoji, timestamp)
                     VALUES ($1::bigint, $2::bigint, $3, $4::bigint)
                     ON CONFLICT DO NOTHING`,
                    [reaction.message.id, user.id, emojiName, Date.now()],
                );
            } catch (err) {
                this.logger.error(
                    `Failed to store reaction: message_id=${reaction.message.id} user_id=${user.id} emoji=${emojiName}\n${toError(err).message}`,
                );
            }
        }
    }

    async insertMessage(message: GuildBotMessage): Promise<void> {
        let replyTo: string | null = null;
        if (message.reference?.messageId)
            try {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                replyTo = repliedMessage?.id ?? null;
            } catch {
                this.logger.error(
                    `Failed to fetch replied message ${message.reference.messageId} (in message ${message.id} by ${message.author.username})`,
                );
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
                replyTo,
            ],
        );
        if (message.reactions.cache.size > 0)
            for (const reaction of message.reactions.cache.values()) await this.insertReaction(reaction);
    }

    async insertReminder(
        userId: string,
        channelId: string,
        reminderMessage: string,
        triggerAt: number,
    ): Promise<number> {
        const rows = await this.query<{ id: number }>(
            `INSERT INTO reminders (user_id, channel_id, reminder_message, trigger_at)
             VALUES ($1::bigint, $2::bigint, $3, $4::bigint)
             RETURNING id`,
            [userId, channelId, reminderMessage, triggerAt],
        );

        return rows[0].id;
    }

    async deleteReminder(id: number): Promise<void> {
        await this.query(`DELETE FROM reminders WHERE id = $1`, [id]);
    }

    async getPendingReminders(): Promise<ReminderRow[]> {
        return this.query<ReminderRow>(
            `SELECT id, user_id::text, channel_id::text, reminder_message, trigger_at
             FROM reminders
             WHERE trigger_at > $1`,
            [Date.now()],
        );
    }

    static fromConfig(config: BotConfig, logger: ILogger): Database {
        const pool = new Pool({
            user: config.db.user,
            host: config.db.host,
            database: config.db.database,
            password: config.db.password,
            port: config.db.port,
            connectionTimeoutMillis: 15000,
            idleTimeoutMillis: 60000,
            keepAlive: true,
            keepAliveInitialDelayMillis: 10000,
        });
        pool.on("error", (err: Error) => {
            logger.error(new Error(`Postgres pool error: ${err.message}`));
        });

        return new Database(pool, logger, config);
    }
}
