import { describe, it, expect, vi, beforeEach } from "vitest";
import { UserHandler } from "../../systems/userHandler";
import type { IDatabase } from "../../interfaces";
import type { ILogger } from "../../interfaces";
import type { Client } from "discord.js";

function makeDb(overrides: Partial<IDatabase> = {}): IDatabase {
    return {
        query: vi.fn().mockResolvedValue([]),
        queryRandomMessage: vi.fn().mockResolvedValue(null),
        insert: vi.fn(),
        initialize: vi.fn().mockResolvedValue(undefined),
        getCurrentUsername: vi.fn().mockResolvedValue(null),
        ensureUserExists: vi.fn().mockResolvedValue(undefined),
        ...overrides,
    } as unknown as IDatabase;
}

function makeLogger(): ILogger {
    return {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        console: vi.fn(),
        startup: vi.fn(),
        printColumns: vi.fn(),
    } as unknown as ILogger;
}

function makeClient(memberName: string | null = null, userName: string | null = null): Client {
    const member = memberName ? { displayName: memberName, user: { id: "uid" } } : null;
    const user = userName ? { id: "uid", username: userName } : null;

    return {
        guilds: {
            fetch: member
                ? vi.fn().mockResolvedValue({
                      members: { fetch: vi.fn().mockResolvedValue(member) },
                  })
                : vi.fn().mockRejectedValue(new Error("guild not found")),
        },
        users: {
            fetch: user ? vi.fn().mockResolvedValue(user) : vi.fn().mockRejectedValue(new Error("user not found")),
        },
    } as unknown as Client;
}

describe("UserHandler.getDisplayName", () => {
    const USER = "user-123";
    const SERVER = "server-456";

    beforeEach(() => vi.clearAllMocks());

    it("returns UNKNOWN_USER when userId is empty", async () => {
        const handler = new UserHandler(makeDb(), makeLogger(), makeClient());
        expect(await handler.getDisplayName("", SERVER)).toBe("Unknown User");
    });

    it("returns UNKNOWN_USER when serverId is empty", async () => {
        const handler = new UserHandler(makeDb(), makeLogger(), makeClient());
        expect(await handler.getDisplayName(USER, "")).toBe("Unknown User");
    });

    it("returns DB name and skips network when DB has a result", async () => {
        const db = makeDb({ getCurrentUsername: vi.fn().mockResolvedValue("DbUser") });
        const client = makeClient();
        const handler = new UserHandler(db, makeLogger(), client);

        const result = await handler.getDisplayName(USER, SERVER);

        expect(result).toBe("DbUser");
        expect(client.guilds.fetch).not.toHaveBeenCalled();
    });

    it("returns cached result on second call without hitting DB again", async () => {
        const db = makeDb({ getCurrentUsername: vi.fn().mockResolvedValue("CachedUser") });
        const handler = new UserHandler(db, makeLogger(), makeClient());

        await handler.getDisplayName(USER, SERVER);
        await handler.getDisplayName(USER, SERVER);

        expect(db.getCurrentUsername).toHaveBeenCalledTimes(1);
    });

    it("falls back to guild member displayName when DB returns null", async () => {
        const db = makeDb({ getCurrentUsername: vi.fn().mockResolvedValue(null) });
        const client = makeClient("GuildMember");
        const handler = new UserHandler(db, makeLogger(), client);

        const result = await handler.getDisplayName(USER, SERVER);

        expect(result).toBe("GuildMember");
    });

    it("falls back to user.username when guild fetch throws", async () => {
        const db = makeDb({ getCurrentUsername: vi.fn().mockResolvedValue(null) });
        const client = makeClient(null, "FallbackUser");
        const handler = new UserHandler(db, makeLogger(), client);

        const result = await handler.getDisplayName(USER, SERVER);

        expect(result).toBe("FallbackUser");
    });

    it("returns UNKNOWN_USER when all three tiers fail", async () => {
        const db = makeDb({ getCurrentUsername: vi.fn().mockResolvedValue(null) });
        const client = makeClient(null, null);
        const handler = new UserHandler(db, makeLogger(), client);

        const result = await handler.getDisplayName(USER, SERVER);

        expect(result).toBe("Unknown User");
    });
});
