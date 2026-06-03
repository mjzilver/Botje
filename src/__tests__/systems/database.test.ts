import { describe, it, expect, vi } from "vitest";
import { Database } from "../../systems/database";
import { createSilentLogger } from "../../systems/logger";
import type { Pool } from "pg";
import { DatabaseError } from "pg";
import type { ILogger } from "../../systems/logger";

function makeMockPool(rows: Record<string, unknown>[] = []): Pool {
    return {
        query: vi.fn().mockResolvedValue({ rows }),
    } as unknown as Pool;
}

function makeMockLogger(): ILogger {
    return {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        startup: vi.fn(),
        console: vi.fn(),
        repeat: vi.fn(),
        printColumns: vi.fn(),
        printRows: vi.fn(),
    };
}

const testConfig = { prefix: "^(b! ?)" };
const logger = createSilentLogger();
describe("Database.getCount", () => {
    it("returns count from subquery", async () => {
        const pool = makeMockPool([{ count: "42" }]);
        const db = new Database(pool, logger, testConfig);
        const count = await db.getCount("SELECT * FROM messages WHERE server_id = $1", ["123"]);
        expect(count).toBe(42);
        expect(pool.query).toHaveBeenCalledWith(expect.stringContaining("COUNT(*)"), ["123"]);
    });
});
describe("Database.queryRandomMessage", () => {
    it("returns empty array when count is 0", async () => {
        const pool = makeMockPool([{ count: "0" }]);
        const db = new Database(pool, logger, testConfig);
        const result = await db.queryRandomMessage("SELECT * FROM messages");
        expect(result).toEqual([]);
    });
    it("fetches with LIMIT 1 OFFSET when count > 0", async () => {
        const message = { id: "1", message: "hello" };
        const pool = {
            query: vi
                .fn()
                .mockResolvedValueOnce({ rows: [{ count: "5" }] })
                .mockResolvedValueOnce({ rows: [message] }),
        } as unknown as Pool;
        const db = new Database(pool, logger, testConfig);
        const result = await db.queryRandomMessage("SELECT * FROM messages");
        expect(result).toEqual([message]);
        expect(pool.query).toHaveBeenCalledTimes(2);
    });
});
describe("Database.ensureUserExists", () => {
    it("inserts user and username when serverId and displayName provided", async () => {
        const pool = makeMockPool([]);
        const db = new Database(pool, logger, testConfig);
        await db.ensureUserExists({ id: "123" }, "456", "TestUser");
        expect(pool.query).toHaveBeenCalledTimes(2);
        expect(pool.query).toHaveBeenNthCalledWith(1, expect.stringContaining("INSERT INTO users"), ["123"]);
        expect(pool.query).toHaveBeenNthCalledWith(2, expect.stringContaining("INSERT INTO usernames"), [
            "123",
            "456",
            "TestUser",
            expect.any(Number),
        ]);
    });
    it("only inserts user when no serverId", async () => {
        const pool = makeMockPool([]);
        const db = new Database(pool, logger, testConfig);
        await db.ensureUserExists({ id: "123" }, null);
        expect(pool.query).toHaveBeenCalledTimes(1);
    });
});
describe("Database.storeMessage", () => {
    it("skips bot messages", async () => {
        const pool = makeMockPool([]);
        const db = new Database(pool, logger, testConfig);
        const msg = {
            cleanContent: "hello",
            content: "hello",
            guild: { id: "1", members: { fetch: vi.fn() } },
            author: { bot: true, id: "10", tag: "Bot#0000" },
            reactions: { cache: new Map() },
        };
        await db.storeMessage(msg as never);
        expect(pool.query).not.toHaveBeenCalled();
    });
    it("skips messages matching prefix", async () => {
        const pool = makeMockPool([]);
        const db = new Database(pool, logger, testConfig);
        const msg = {
            cleanContent: "b!speak hello",
            content: "b!speak hello",
            guild: { id: "1", members: { fetch: vi.fn() } },
            author: { bot: false, id: "10", tag: "User#0001" },
            reactions: { cache: new Map() },
        };
        await db.storeMessage(msg as never);
        expect(pool.query).not.toHaveBeenCalled();
    });
    it("skips empty messages", async () => {
        const pool = makeMockPool([]);
        const db = new Database(pool, logger, testConfig);
        const msg = {
            cleanContent: "",
            content: "",
            guild: { id: "1" },
            author: { bot: false, id: "10", tag: "User#0001" },
            reactions: { cache: new Map() },
        };
        await db.storeMessage(msg as never);
        expect(pool.query).not.toHaveBeenCalled();
    });
});
describe("Database.getCurrentUsername", () => {
    it("returns username when found", async () => {
        const pool = makeMockPool([{ user_name: "Alice" }]);
        const db = new Database(pool, logger, testConfig);
        const name = await db.getCurrentUsername("123", "456");
        expect(name).toBe("Alice");
    });
    it("returns null when not found", async () => {
        const pool = makeMockPool([]);
        const db = new Database(pool, logger, testConfig);
        const name = await db.getCurrentUsername("123", "456");
        expect(name).toBeNull();
    });
});

describe("Database.query", () => {
    it("logs SQL parameters and postgres metadata on failure", async () => {
        const dbError = new DatabaseError("insert failed", 0, "error");
        dbError.code = "23505";
        dbError.detail = "Key already exists";
        dbError.constraint = "reactions_pkey";
        const pool = {
            query: vi.fn().mockRejectedValue(dbError),
        } as unknown as Pool;
        const mockLogger = makeMockLogger();
        const db = new Database(pool, mockLogger, testConfig);

        await expect(db.query("SELECT $1", ["abc"])).rejects.toThrow("insert failed");
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining('params=["abc"]'));
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("code=23505"));
        expect(mockLogger.error).toHaveBeenCalledWith(expect.stringContaining("constraint=reactions_pkey"));
    });
});

describe("Database.insertReaction", () => {
    it("skips insert when emoji name is missing", async () => {
        const pool = makeMockPool([]);
        const mockLogger = makeMockLogger();
        const db = new Database(pool, mockLogger, testConfig);
        const reaction = {
            emoji: { name: null },
            message: { id: "123" },
            users: {
                cache: new Map([["111", { id: "111" }]]),
                fetch: vi.fn().mockResolvedValue(new Map()),
            },
        };

        await db.insertReaction(reaction as never);

        expect(pool.query).not.toHaveBeenCalled();
        expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining("reason=missing emoji name"));
    });
});
