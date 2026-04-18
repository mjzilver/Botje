import { describe, it, expect, vi, beforeEach } from "vitest";
import { MessageIterator } from "../../systems/messageIterator";
import type { IterableMessage } from "../../systems/messageIterator";
import type { ILogger } from "../../interfaces";

function makeLogger(): ILogger {
    return {
        error: vi.fn(),
        warn: vi.fn(),
        info: vi.fn(),
        debug: vi.fn(),
        console: vi.fn(),
        startup: vi.fn(),
    } as unknown as ILogger;
}

function makeMessage(id: string, content = ""): IterableMessage {
    return { id, content, author: { id: "u1", bot: false }, delete: vi.fn().mockResolvedValue({ id, content }) };
}

function makeChannel(batches: IterableMessage[][], lastMessageId = "start") {
    let callCount = 0;

    return {
        name: "test-channel",
        lastMessageId,
        messages: {
            fetch: vi.fn().mockImplementation(() => {
                const batch = batches[callCount++] ?? [];
                const map = new Map(batch.map((m) => [m.id, m]));

                return Promise.resolve(map);
            }),
        },
        guild: { name: "test-guild" },
    };
}

describe("MessageIterator.iterate", () => {
    let logger: ILogger;
    beforeEach(() => {
        logger = makeLogger();
    });

    it("calls onMessage for each message in a single batch", async () => {
        const messages = [makeMessage("1"), makeMessage("2"), makeMessage("3")];
        const channel = makeChannel([messages, []]);
        const onMessage = vi.fn();
        const iterator = new MessageIterator(logger, { onMessage });

        await iterator.iterate(channel);

        expect(onMessage).toHaveBeenCalledTimes(3);
    });

    it("calls onComplete with total count after iteration", async () => {
        const messages = [makeMessage("1"), makeMessage("2")];
        const channel = makeChannel([messages, []]);
        const onComplete = vi.fn();
        const iterator = new MessageIterator(logger, { onComplete });

        await iterator.iterate(channel);

        expect(onComplete).toHaveBeenCalledWith({ totalProcessed: 2 });
    });

    it("stops immediately when channel has no lastMessageId", async () => {
        const channel = makeChannel([], null as unknown as string);
        channel.lastMessageId = null as unknown as string;
        const onComplete = vi.fn();
        const iterator = new MessageIterator(logger, { onComplete });

        await iterator.iterate(channel);

        expect(onComplete).toHaveBeenCalledWith({ totalProcessed: 0 });
        expect(channel.messages.fetch).not.toHaveBeenCalled();
    });

    it("respects the limit option and stops early", async () => {
        const allMessages = Array.from({ length: 100 }, (_, i) => makeMessage(`${i}`));
        const channel = {
            name: "test-channel",
            lastMessageId: "start",
            messages: {
                fetch: vi.fn().mockImplementation(({ limit }: { limit: number }) => {
                    const batch = allMessages.slice(0, limit);
                    const map = new Map(batch.map((m) => [m.id, m]));

                    return Promise.resolve(map);
                }),
            },
            guild: { name: "test-guild" },
        };
        const onMessage = vi.fn();
        const iterator = new MessageIterator(logger, { onMessage, limit: 50, logProgress: false });

        await iterator.iterate(channel);

        expect(onMessage).toHaveBeenCalledTimes(50);
    });

    it("logs an error and calls onComplete when fetch throws", async () => {
        const channel = {
            name: "bad-channel",
            lastMessageId: "start",
            messages: { fetch: vi.fn().mockRejectedValue(new Error("network fail")) },
            guild: { name: "g" },
        };
        const onComplete = vi.fn();
        const iterator = new MessageIterator(logger, { onComplete });

        await iterator.iterate(channel);

        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("network fail"));
        expect(onComplete).toHaveBeenCalledWith({ totalProcessed: 0 });
    });

    it("uses the provided startMessageId instead of channel.lastMessageId", async () => {
        const messages = [makeMessage("99")];
        const channel = makeChannel([messages, []]);
        const onMessage = vi.fn();
        const iterator = new MessageIterator(logger, { onMessage });

        await iterator.iterate(channel, "custom-start");

        expect(channel.messages.fetch).toHaveBeenCalledWith(
            expect.objectContaining({ before: "custom-start" }),
        );
    });
});
