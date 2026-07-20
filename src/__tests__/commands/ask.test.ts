import { describe, it, expect, vi, beforeEach } from "vitest";
import askCommand from "../../commands/ask";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("ask command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("sends 'Thinking...' reply then streams to LLM", async () => {
        const context = makeMockContext();
        const thinkingMsg = makeMessage("Thinking...");

        vi.mocked(context.messageHandler.reply).mockResolvedValueOnce(thinkingMsg);
        vi.mocked(context.llm.streamToMessage).mockResolvedValueOnce("Hello!");

        await askCommand.function(makeMessage("!ask what is love"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("Thinking"),
        );
        expect(context.llm.streamToMessage).toHaveBeenCalledOnce();
        expect(context.messageHandler.react).toHaveBeenCalledWith(thinkingMsg, "🤖");
    });

    it("returns early and does not stream when reply returns undefined", async () => {
        const context = makeMockContext();

        vi.mocked(context.messageHandler.reply).mockResolvedValueOnce(null);

        await askCommand.function(makeMessage("!ask hello"), context);

        expect(context.llm.streamToMessage).not.toHaveBeenCalled();
    });

    it("builds a conversation chain from a message reference before prompting", async () => {
        const context = makeMockContext();
        const msg = makeMessage("!ask tell me more");
        const prevMsg = makeMessage("prior context goes here");

        Object.assign(msg, { reference: { messageId: "ref-123" } });
        (msg.channel.messages.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(prevMsg);

        const thinkingMsg = makeMessage("Thinking...");

        vi.mocked(context.messageHandler.reply).mockResolvedValueOnce(thinkingMsg);
        vi.mocked(context.llm.streamToMessage).mockResolvedValueOnce("response");

        await askCommand.function(msg, context);

        expect(msg.channel.messages.fetch).toHaveBeenCalledWith("ref-123");
        expect(context.llm.streamToMessage).toHaveBeenCalledOnce();
    });

    it("passes a filterFn that strips banned phrases from LLM output", async () => {
        const context = makeMockContext();
        const thinkingMsg = makeMessage("Thinking...");

        vi.mocked(context.messageHandler.reply).mockResolvedValueOnce(thinkingMsg);

        let capturedFilter: ((text: string) => string) | null = null;

        vi.mocked(context.llm.streamToMessage).mockImplementation(async (_m, _p, filterFn) => {
            capturedFilter = filterFn ?? null;

            return null;
        });

        await askCommand.function(makeMessage("!ask hey"), context);

        if (capturedFilter === null) {
            throw new Error("filterFn missing");
        }

        const filter = capturedFilter as unknown as (text: string) => string;
        expect(filter("bot: hello world")).toBe("hello world");
        expect(filter("user: something here")).toBe("something here");
        expect(filter("plain text")).toBe("plain text");
    });
});
