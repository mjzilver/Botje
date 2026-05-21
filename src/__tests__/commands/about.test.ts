import { describe, it, expect, vi, beforeEach } from "vitest";
import aboutCommand from "../../commands/about";
import { makeMockContext, makeMessage } from "@test/helpers";
import type { ICommand } from "../../interfaces";

function stubSpeak(context: ReturnType<typeof makeMockContext>): ReturnType<typeof vi.fn> {
    const speakFn = vi.fn().mockResolvedValue(undefined);
    vi.mocked(context.loadedCommands.commands as Record<string, ICommand>)["speak"] = {
        name: "speak",
        description: "",
        format: "",
        function: speakFn,
    };
    return speakFn;
}

describe("about command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies when no topic phrase is given", async () => {
        const context = makeMockContext();
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await aboutCommand.function(makeMessage("!about"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("topic"),
        );
    });

    it("calls speak with a synthetic about message containing the picked topic word", async () => {
        const context = makeMockContext();
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());
        const speakFn = stubSpeak(context);

        await aboutCommand.function(makeMessage("!about the weather"), context);

        expect(speakFn).toHaveBeenCalledOnce();
        const [syntheticMsg] = speakFn.mock.calls[0];
        expect(syntheticMsg.content).toContain("weather");
        expect(syntheticMsg.content).toContain("speak");
    });

    it("filters stop words when picking the topic", async () => {
        const context = makeMockContext();
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set(["the", "this"]));
        const speakFn = stubSpeak(context);

        await aboutCommand.function(makeMessage("!about the sunshine"), context);

        const [syntheticMsg] = speakFn.mock.calls[0];
        expect(syntheticMsg.content).toContain("sunshine");
        expect(syntheticMsg.content).not.toContain("the");
    });

    it("picks the content-richest word (highest vowel groups) when multiple words given", async () => {
        const context = makeMockContext();
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());
        const speakFn = stubSpeak(context);

        await aboutCommand.function(makeMessage("!about cat education"), context);

        const [syntheticMsg] = speakFn.mock.calls[0];
        expect(syntheticMsg.content).toContain("education");
    });

    it("passes the original message channel and guild through to speak", async () => {
        const context = makeMockContext();
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());
        const speakFn = stubSpeak(context);
        const msg = makeMessage("!about football", { guildId: "srv-1", channelId: "ch-1" });

        await aboutCommand.function(msg, context);

        const [syntheticMsg] = speakFn.mock.calls[0];
        expect(syntheticMsg.channel.id).toBe("ch-1");
        expect(syntheticMsg.guild?.id).toBe("srv-1");
    });
});
