import { describe, it, expect, vi, beforeEach } from "vitest";

import { MessageHandler } from "../../systems/messageHandler";
import type { IDatabase, ILogger } from "../../interfaces";
import type { BotConfig } from "../../interfaces/config";
import type { BotMessage, MessageContent } from "../../interfaces/discord";

function makeMockDb(): IDatabase {
    return {
        insert: vi.fn(),
        query: vi.fn().mockResolvedValue([]),
    } as unknown as IDatabase;
}

function makeMockLogger(): ILogger {
    return { debug: vi.fn(), error: vi.fn(), warn: vi.fn(), info: vi.fn() } as unknown as ILogger;
}

const config = {
    positive_emoji: "👍",
    negative_emoji: "👎",
} as unknown as BotConfig;

function makeMessage(id = "msg-1"): BotMessage {
    return {
        id,
        content: "!ping",
        createdAt: new Date(1000),
        createdTimestamp: 1000,
        author: { id: "u1", username: "user", bot: false },
        channel: { id: "ch1", name: "general", send: vi.fn() },
        reply: vi.fn(),
        react: vi.fn().mockResolvedValue(undefined),
        edit: vi.fn(),
        delete: vi.fn().mockResolvedValue(undefined),
        reactions: undefined,
        isSlashCommand: false,
    } as unknown as BotMessage;
}

function makeSentMessage(id = "sent-1"): BotMessage {
    return { id, reactions: undefined } as unknown as BotMessage;
}

describe("MessageHandler", () => {
    let db: IDatabase;
    let logger: ILogger;
    let handler: MessageHandler;

    beforeEach(() => {
        db = makeMockDb();
        logger = makeMockLogger();
        handler = new MessageHandler(db, logger, config);
    });

    describe("send", () => {
        it("calls channel.send with the provided content", async () => {
            const call = makeMessage();
            const sent = makeSentMessage();

            vi.mocked(call.channel.send).mockResolvedValue(sent);

            await handler.send(call, "hello");

            expect(call.channel.send).toHaveBeenCalledWith("hello");
        });

        it("returns undefined and logs an error when content is empty", async () => {
            const call = makeMessage();
            const result = await handler.send(call, "");

            expect(result).toBeUndefined();
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe("reply", () => {
        it("calls the message's own reply method with the content", async () => {
            const call = makeMessage();
            const sent = makeSentMessage();

            vi.mocked(call.reply).mockResolvedValue(sent);

            await handler.reply(call, "pong");

            expect(call.reply).toHaveBeenCalledWith("pong");
        });

        it("returns undefined and logs an error when content is empty", async () => {
            const call = makeMessage();
            const result = await handler.reply(call, "" as MessageContent);

            expect(result).toBeUndefined();
            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe("react", () => {
        it("calls message.react with the given emoji", async () => {
            const msg = makeMessage();

            await handler.react(msg, "👍");

            expect(msg.react).toHaveBeenCalledWith("👍");
        });

        it("swallows errors from message.react and logs debug", async () => {
            const msg = makeMessage();

            vi.mocked(msg.react).mockRejectedValue(new Error("deleted"));

            await expect(handler.react(msg, "👍")).resolves.toBeUndefined();
            expect(logger.debug).toHaveBeenCalled();
        });
    });

    describe("edit", () => {
        it("calls message.edit with the new content", async () => {
            const msg = makeMessage();
            const edited = makeSentMessage();

            vi.mocked(msg.edit).mockResolvedValue(edited);

            await handler.edit(msg, "updated");

            expect(msg.edit).toHaveBeenCalledWith("updated");
        });

        it("rejects when message.edit rejects", async () => {
            const msg = makeMessage();

            vi.mocked(msg.edit).mockRejectedValue(new Error("deleted"));

            await expect(handler.edit(msg, "updated")).rejects.toThrow("deleted");
        });
    });

    describe("delete", () => {
        it("calls message.delete", async () => {
            const msg = makeMessage();

            await handler.delete(msg);

            expect(msg.delete).toHaveBeenCalledOnce();
        });

        it("swallows delete errors and logs debug", async () => {
            const msg = makeMessage();

            vi.mocked(msg.delete).mockRejectedValue(new Error("already gone"));

            await expect(handler.delete(msg)).resolves.toBeUndefined();
            expect(logger.debug).toHaveBeenCalled();
        });
    });

    describe("findFromReply", () => {
        it("returns the call id for a known reply id", async () => {
            const call = makeMessage("call-1");
            const sent = makeSentMessage("reply-1");

            vi.mocked(call.channel.send).mockResolvedValue(sent);
            await handler.send(call, "content");

            const replyMsg = { id: "reply-1" } as unknown as BotMessage;

            expect(handler.findFromReply(replyMsg)).toBe("call-1");
        });

        it("returns undefined for an unknown reply id", () => {
            const unknown = { id: "not-tracked" } as unknown as BotMessage;

            expect(handler.findFromReply(unknown)).toBeUndefined();
        });
    });

    describe("markComplete", () => {
        it("calls db.insert with the call id", () => {
            const call = makeMessage("call-1");

            handler.markComplete(call);

            expect(db.insert).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(["call-1"]));
        });

        it("calls the command list remover if registered", () => {
            const remover = vi.fn();
            const call = makeMessage();

            handler.setCommandListRemover(remover);
            handler.markComplete(call);

            expect(remover).toHaveBeenCalledWith(call);
        });
    });

    describe("addCommandCall", () => {
        it("tracks the call-to-reply mapping", async () => {
            const call = makeMessage("call-1");
            const reply = makeSentMessage("reply-1");

            vi.mocked(call.channel.send).mockResolvedValue(reply);
            await handler.send(call, "hi");

            expect(handler.findFromReply({ id: "reply-1" } as unknown as BotMessage)).toBe("call-1");
        });

        it("calls db.insert with call and reply ids", () => {
            const call = makeMessage("c1");
            const reply = makeSentMessage("r1");

            handler.addCommandCall(call, reply);

            expect(db.insert).toHaveBeenCalledWith(expect.any(String), expect.arrayContaining(["c1", "r1"]));
        });
    });

    describe("loadCommandCalls", () => {
        it("populates commandCalls from the database", async () => {
            vi.mocked(db.query).mockResolvedValue([{ call_id: "c1", reply_id: "r1" }]);

            await handler.loadCommandCalls();

            expect(handler.findFromReply({ id: "r1" } as unknown as BotMessage)).toBe("c1");
        });

        it("logs an error if the database query fails", async () => {
            vi.mocked(db.query).mockRejectedValue(new Error("db down"));

            await handler.loadCommandCalls();

            expect(logger.error).toHaveBeenCalled();
        });
    });

    describe("getCommandCalls", () => {
        it("returns a copy of the current command calls map", () => {
            const calls = handler.getCommandCalls();

            expect(calls).toEqual({});
        });

        it("returned copy does not mutate internal state", async () => {
            const call = makeMessage("c1");
            const sent = makeSentMessage("r1");

            vi.mocked(call.channel.send).mockResolvedValue(sent);
            await handler.send(call, "hi");

            const snapshot = handler.getCommandCalls();
            delete snapshot["c1"];

            expect(handler.findFromReply({ id: "r1" } as unknown as BotMessage)).toBe("c1");
        });
    });
});
