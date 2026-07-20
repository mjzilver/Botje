import { describe, it, expect, vi, beforeEach } from "vitest";
import aboutCommand from "../../commands/about";
import { makeMockContext, makeMessage } from "@test/helpers";

vi.mock("../../commands/speak", () => ({
    speakAbout: vi.fn().mockResolvedValue(undefined),
    default: { name: "speak", description: "", format: "", function: vi.fn() },
}));

import { speakAbout } from "../../commands/speak";

describe("about command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("falls back to the channel topic when no phrase is given", async () => {
        const context = makeMockContext();
        const msg = makeMessage("!about");
        (msg.channel.messages.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
            new Map([
                [
                    "1",
                    {
                        ...msg,
                        cleanContent: "the weather forecast today",
                        author: { bot: false },
                        createdTimestamp: Date.now(),
                    },
                ],
            ]),
        );
        vi.mocked(context.database.query).mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await aboutCommand.function(msg, context);

        expect(speakAbout).toHaveBeenCalledOnce();
    });

    it("replies when no phrase and no context topic can be found", async () => {
        const context = makeMockContext();
        const msg = makeMessage("!about");
        (msg.channel.messages.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(new Map());
        vi.mocked(context.database.query).mockResolvedValue([{ cnt: "9999" }]);
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await aboutCommand.function(msg, context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("topic"));
    });

    it("calls speakAbout with the extracted topic", async () => {
        const context = makeMockContext();

        await aboutCommand.function(makeMessage("!about the weather"), context);

        expect(speakAbout).toHaveBeenCalledOnce();
        const [topic] = vi.mocked(speakAbout).mock.calls[0];
        expect(topic).toBe("weather");
    });

    it("picks a noun from the phrase, ignoring adjectives and adverbs", async () => {
        const context = makeMockContext();

        await aboutCommand.function(makeMessage("!about the weather forecast"), context);

        const [topic] = vi.mocked(speakAbout).mock.calls[0];
        expect(["weather", "forecast"]).toContain(topic);
    });

    it("picks a noun even when the phrase contains multiple words", async () => {
        const context = makeMockContext();

        await aboutCommand.function(makeMessage("!about cat education"), context);

        const [topic] = vi.mocked(speakAbout).mock.calls[0];
        expect(["cat", "education"]).toContain(topic);
    });

    it("passes the original message through to speakAbout", async () => {
        const context = makeMockContext();
        const msg = makeMessage("!about football", { guildId: "srv-1", channelId: "ch-1" });

        await aboutCommand.function(msg, context);

        const [, passedMessage] = vi.mocked(speakAbout).mock.calls[0];
        expect(passedMessage.channel.id).toBe("ch-1");
        expect(passedMessage.guild?.id).toBe("srv-1");
    });
});
