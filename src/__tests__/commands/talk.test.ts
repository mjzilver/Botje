import { describe, it, expect, vi, beforeEach } from "vitest";
import talkCommand from "../../commands/talk";
import { makeMockContext, makeMessage } from "@test/helpers";

function mockDbWithRows(rows: { message: string }[]) {
    const ctx = makeMockContext();
    ctx.database.query = vi.fn().mockResolvedValue(rows);

    return ctx;
}

describe("talk command – metadata", () => {
    it("has name 'talk'", () => expect(talkCommand.name).toBe("talk"));
});

describe("talk command – execution", () => {
    beforeEach(() => vi.clearAllMocks());

    it("queries without user_id filter when no mention", async () => {
        const context = mockDbWithRows([{ message: "hello world" }]);
        await talkCommand.function(makeMessage("!talk"), context);

        const sql: string = (context.database.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(sql).not.toContain("user_id = $1");
        expect(sql).toContain("LIMIT 5000");
    });

    it("queries with user_id filter when mention is present", async () => {
        const context = mockDbWithRows([{ message: "hello world" }]);
        const message = makeMessage("!talk @user");
        const user = { id: "123", username: "Jane" };
        message.mentions.users.set("123", user as never);
        Object.assign(message.mentions.users, { first: () => user });

        await talkCommand.function(message, context);

        const sql: string = (context.database.query as ReturnType<typeof vi.fn>).mock.calls[0][0];
        expect(sql).toContain("user_id = $1");
        const params = (context.database.query as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(params).toEqual(["123"]);
    });

    it("sends a sentence when chain can be built", async () => {
        const context = mockDbWithRows([{ message: "the cat sat on the mat" }, { message: "the dog ran in the park" }]);
        await talkCommand.function(makeMessage("!talk"), context);

        expect(context.messageHandler.send).toHaveBeenCalledOnce();
        const sent = (context.messageHandler.send as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
        expect(typeof sent).toBe("string");
        expect(sent.length).toBeGreaterThan(0);
    });

    it("does not send when DB returns no rows", async () => {
        const context = mockDbWithRows([]);
        await talkCommand.function(makeMessage("!talk"), context);

        expect(context.messageHandler.send).not.toHaveBeenCalled();
    });
});
