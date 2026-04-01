import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

import { ReplyHandler } from "../../systems/replyHandler";
import type { IMessageHandler, ILogger } from "../../interfaces";
import type { BotMessage } from "../../interfaces/discord";

function makeMockMessageHandler(): IMessageHandler {
    return { send: vi.fn(), reply: vi.fn() } as unknown as IMessageHandler;
}

function makeMockLogger(): ILogger {
    return { debug: vi.fn(), error: vi.fn() } as unknown as ILogger;
}

function makeMessage(content: string): BotMessage {
    return {
        content,
        author: { id: "u1", username: "tester", bot: false },
        channel: { id: "ch1" },
    } as unknown as BotMessage;
}

const basePattern = {
    name: "greeting",
    regex: "hello",
    replies: ["hi!"],
    reply: true,
    mention: false,
    timeout: 0,
};

describe("ReplyHandler", () => {
    let mh: IMessageHandler;
    let logger: ILogger;

    beforeEach(() => {
        mh = makeMockMessageHandler();
        logger = makeMockLogger();
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    describe("process", () => {
        it("returns false when no pattern matches", () => {
            const handler = new ReplyHandler(mh, logger, [basePattern]);

            expect(handler.process(makeMessage("goodbye"))).toBe(false);
        });

        it("returns true when a pattern matches", () => {
            const handler = new ReplyHandler(mh, logger, [basePattern]);

            expect(handler.process(makeMessage("hello world"))).toBe(true);
        });

        it("calls reply when pattern.reply is true", () => {
            const handler = new ReplyHandler(mh, logger, [basePattern]);

            handler.process(makeMessage("hello"));

            expect(mh.reply).toHaveBeenCalledOnce();
            expect(mh.send).not.toHaveBeenCalled();
        });

        it("calls send when pattern.reply is false", () => {
            const sendPattern = { ...basePattern, reply: false };
            const handler = new ReplyHandler(mh, logger, [sendPattern]);

            handler.process(makeMessage("hello"));

            expect(mh.send).toHaveBeenCalledOnce();
            expect(mh.reply).not.toHaveBeenCalled();
        });

        it("appends username when mention is true", () => {
            const mentionPattern = { ...basePattern, mention: true };
            const handler = new ReplyHandler(mh, logger, [mentionPattern]);

            handler.process(makeMessage("hello"));

            const text = vi.mocked(mh.reply).mock.calls[0][1] as string;

            expect(text).toMatch("tester");
        });

        it("does not append username when mention is false", () => {
            const handler = new ReplyHandler(mh, logger, [basePattern]);

            handler.process(makeMessage("hello"));

            const text = vi.mocked(mh.reply).mock.calls[0][1] as string;

            expect(text).not.toMatch("tester");
        });

        it("blocks a second match within the cooldown window", () => {
            const cooldownPattern = { ...basePattern, timeout: 5 };
            const handler = new ReplyHandler(mh, logger, [cooldownPattern]);

            handler.process(makeMessage("hello"));
            vi.advanceTimersByTime(1000);
            handler.process(makeMessage("hello"));

            expect(mh.reply).toHaveBeenCalledOnce();
        });

        it("allows a match after the cooldown window has elapsed", () => {
            const cooldownPattern = { ...basePattern, timeout: 5 };
            const handler = new ReplyHandler(mh, logger, [cooldownPattern]);

            handler.process(makeMessage("hello"));
            vi.advanceTimersByTime(5 * 60 * 1000 + 1);
            handler.process(makeMessage("hello"));

            expect(mh.reply).toHaveBeenCalledTimes(2);
        });

        it("matches against multiple patterns independently", () => {
            const secondPattern = {
                name: "bye",
                regex: "goodbye",
                replies: ["later!"],
                reply: true,
                mention: false,
                timeout: 0,
            };
            const handler = new ReplyHandler(mh, logger, [basePattern, secondPattern]);

            handler.process(makeMessage("goodbye everyone"));

            expect(mh.reply).toHaveBeenCalledOnce();
        });

        it("logs a debug message when a pattern matches", () => {
            const handler = new ReplyHandler(mh, logger, [basePattern]);

            handler.process(makeMessage("hello"));

            expect(vi.mocked(logger.debug)).toHaveBeenCalled();
        });
    });
});
