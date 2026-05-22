import { describe, it, expect, vi, beforeEach } from "vitest";
import speakCommand, { extractTopicSentences } from "../../commands/speak";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("extractTopicSentences", () => {
    it("returns empty array when no messages are provided", () => {
        expect(extractTopicSentences([], "cats")).toEqual([]);
    });

    it("returns empty array when no sentences contain the topic", () => {
        expect(extractTopicSentences(["dogs are great", "birds fly high"], "cats")).toEqual([]);
    });

    it("extracts sentences that contain the topic", () => {
        const result = extractTopicSentences(["cats is very cool indeed"], "cats");
        expect(result).toHaveLength(1);
        expect(result[0].toLowerCase()).toContain("cats");
    });

    it("capitalises the first letter of each sentence", () => {
        const result = extractTopicSentences(["cats is very nice today"], "cats");
        expect(result[0][0]).toBe(result[0][0].toUpperCase());
    });

    it("filters out sentences shorter than the minimum word count", () => {
        const result = extractTopicSentences(["cats is cool"], "cats");
        expect(result).toEqual([]);
    });

    it("filters out sentences longer than the maximum word count", () => {
        const long = Array.from({ length: 26 }, (_, i) => `word${i}`).join(" ") + " cats";
        const result = extractTopicSentences([long], "cats");
        expect(result).toEqual([]);
    });

    it("splits a multi-sentence message into individual sentences", () => {
        const result = extractTopicSentences(["Dogs are fine. Cats are very nice indeed."], "cats");
        expect(result).toHaveLength(1);
        expect(result[0].toLowerCase()).toContain("cats");
    });

    it("is case-insensitive when matching topic", () => {
        const result = extractTopicSentences(["CATS are really cool"], "cats");
        expect(result).toHaveLength(1);
    });
});

describe("speak command – findTopic path", () => {
    beforeEach(() => vi.clearAllMocks());

    it("falls back to findByWord when no usable sentences can be extracted", async () => {
        const context = makeMockContext();

        vi.mocked(context.dictionary.getStopWordsRegex).mockReturnValue(/$/g);
        vi.mocked(context.database.query).mockResolvedValueOnce([{ message: "cats is cool" }]);
        vi.mocked(context.database.queryRandomMessage).mockResolvedValueOnce([
            { message: "cats are everywhere in this city" },
        ]);

        await speakCommand.function(makeMessage("!speak about cats"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("cats"),
            ),
        );
    });

    it("produces a composite reply when 3 or more topic rows are available", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce([
            { message: "cats is very cool" },
            { message: "cats are nice animals" },
            { message: "cats are fluffy and soft" },
        ]);

        await speakCommand.function(makeMessage("!speak about cats"), context);

        await vi.waitFor(() => expect(context.messageHandler.reply).toHaveBeenCalled());
        const replyArg = vi.mocked(context.messageHandler.reply).mock.calls[0]?.[1] as string;

        expect(typeof replyArg).toBe("string");
        expect(replyArg.length).toBeGreaterThan(0);
    });

    it("uses findByWord directly when content has no topic trigger", async () => {
        const context = makeMockContext();

        vi.mocked(context.dictionary.getStopWordsRegex).mockReturnValue(/$/g);
        vi.mocked(context.database.queryRandomMessage).mockResolvedValueOnce([
            { message: "just a random sentence from the database" },
        ]);

        await speakCommand.function(makeMessage("!speak hello"), context);

        await vi.waitFor(() => expect(context.messageHandler.send).toHaveBeenCalled());
        expect(context.database.query).not.toHaveBeenCalled();
    });
});
