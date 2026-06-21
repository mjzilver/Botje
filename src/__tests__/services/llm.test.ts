import { describe, it, expect, vi, beforeEach } from "vitest";
import { LlmService } from "../../services/llm";
import type { LlmConfig } from "../../interfaces/config";
import type { IMessageHandler } from "../../handlers/messageHandler";
import type { ILogger } from "../../interfaces";
import type { BotMessage } from "../../interfaces/discord";

const CONFIG: LlmConfig = {
    model: "test-model",
    api: "http://localhost:11434/api/generate",
    base_prompt: "",
    conversation: "",
    conversation_prompt: "",
    tarot_prompt: "",
    max_concurrent_requests: 1,
};

function makeMessageHandler(editResolves = true): IMessageHandler {
    return {
        reply: vi.fn(),
        edit: editResolves ? vi.fn().mockResolvedValue(undefined) : vi.fn().mockRejectedValue(new Error("deleted")),
        send: vi.fn(),
        delete: vi.fn(),
        react: vi.fn(),
        addCommandCall: vi.fn(),
        markComplete: vi.fn(),
        findFromReply: vi.fn(),
    } as unknown as IMessageHandler;
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

function makeMessage(): BotMessage {
    return { id: "msg-id", content: "!ask test" } as unknown as BotMessage;
}

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
    const encoder = new TextEncoder();
    let i = 0;

    return new ReadableStream({
        pull(controller) {
            if (i < chunks.length) {
                controller.enqueue(encoder.encode(chunks[i++]));
            } else {
                controller.close();
            }
        },
    });
}

function mockFetch(chunks: string[]): void {
    global.fetch = vi.fn().mockResolvedValue({
        body: makeStream(chunks),
    });
}

describe("LlmService.streamToMessage", () => {
    beforeEach(() => vi.clearAllMocks());

    it("accumulates text from streamed JSON chunks and returns it", async () => {
        mockFetch([JSON.stringify({ response: "Hello" }), "\n" + JSON.stringify({ response: " world" })]);
        const handler = makeMessageHandler();
        const service = new LlmService(CONFIG, makeLogger(), handler);

        const result = await service.streamToMessage(makeMessage(), "prompt");

        expect(result).toBe("Hello world");
        expect(handler.edit).toHaveBeenCalled();
    });

    it("releases the slot so a queued second request can proceed", async () => {
        global.fetch = vi
            .fn()
            .mockImplementation(() => Promise.resolve({ body: makeStream([JSON.stringify({ response: "ok" })]) }));
        const handler = makeMessageHandler();
        const service = new LlmService(CONFIG, makeLogger(), handler);

        const first = service.streamToMessage(makeMessage(), "p1");
        const second = service.streamToMessage(makeMessage(), "p2");

        const [r1, r2] = await Promise.all([first, second]);
        expect(r1).toBe("ok");
        expect(r2).toBe("ok");
    });

    it("logs warning and resolves when LLM returns an error payload, then releases slot", async () => {
        global.fetch = vi
            .fn()
            .mockImplementation(() =>
                Promise.resolve({ body: makeStream([JSON.stringify({ error: "out of memory" })]) }),
            );
        const handler = makeMessageHandler();
        const logger = makeLogger();
        const service = new LlmService(CONFIG, logger, handler);

        const result = await service.streamToMessage(makeMessage(), "p");
        expect(result).toBe("");
        expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("out of memory"));

        const second = service.streamToMessage(makeMessage(), "p2");
        await expect(second).resolves.toBe("");
    });

    it("stops streaming when message edit fails and still releases slot", async () => {
        global.fetch = vi
            .fn()
            .mockImplementation(() => Promise.resolve({ body: makeStream([JSON.stringify({ response: "hi" })]) }));
        const handler = makeMessageHandler(false);
        const logger = makeLogger();
        const service = new LlmService(CONFIG, logger, handler);

        const result = await service.streamToMessage(makeMessage(), "p");
        expect(typeof result).toBe("string");
        expect(logger.error).not.toHaveBeenCalled();

        const second = service.streamToMessage(makeMessage(), "p2");
        await expect(second).resolves.toBeDefined();
    });

    it("applies filterFn to the accumulated text before editing", async () => {
        mockFetch([JSON.stringify({ response: "hello" })]);
        const handler = makeMessageHandler();
        const service = new LlmService(CONFIG, makeLogger(), handler);
        const filter = (t: string) => t.toUpperCase();

        await service.streamToMessage(makeMessage(), "p", filter);

        const editArg = (handler.edit as ReturnType<typeof vi.fn>).mock.calls[0][1];
        expect(editArg).toBe("HELLO");
    });
});
