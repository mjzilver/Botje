import { describe, it, expect, vi } from "vitest";
import { extractTopics } from "../../systems/topicExtractor";
import type { IDatabase } from "../../systems/database";
import type { IDictionary } from "../../systems/dictionary";

function makeMockDb(docFreq = 5): IDatabase {
    return {
        query: vi.fn().mockResolvedValue([{ cnt: String(docFreq) }]),
    } as unknown as IDatabase;
}

function makeMockDictionary(): IDictionary {
    return {
        getStopWordsRegex: vi
            .fn()
            .mockReturnValue(/^(the|and|for|that|this|with|from|have|will|been)$/i),
    };
}

describe("extractTopics", () => {
    it("returns empty array when no messages are given", async () => {
        const topics = await extractTopics([], makeMockDb(), makeMockDictionary());
        expect(topics).toEqual([]);
    });

    it("returns empty array when all words are stop words", async () => {
        const messages = [{ cleanContent: "the and for that this" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics).toEqual([]);
    });

    it("returns empty array when all words are too short", async () => {
        const messages = [{ cleanContent: "hi ok no go" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics).toEqual([]);
    });

    it("returns the most-mentioned word first when document frequencies are equal", async () => {
        const messages = [
            { cleanContent: "weather forecast weather" },
            { cleanContent: "beautiful weather today" },
        ];
        const topics = await extractTopics(messages, makeMockDb(5), makeMockDictionary());
        expect(topics[0]).toBe("weather");
    });

    it("ranks words from rarer corpus higher than identical words from common corpus", async () => {
        const messages = [{ cleanContent: "sunshine today beautiful sunshine" }];
        const rareTopics = await extractTopics(messages, makeMockDb(1), makeMockDictionary());
        const commonTopics = await extractTopics(messages, makeMockDb(99999), makeMockDictionary());
        expect(rareTopics.length).toBeGreaterThan(0);
        expect(commonTopics.length).toBeGreaterThan(0);
        expect(rareTopics[0]).toBe(commonTopics[0]);
    });

    it("strips non-letter characters before scoring", async () => {
        const messages = [{ cleanContent: "hello-world!! testing1234 great" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics.every((t) => /^[a-z]+$/.test(t))).toBe(true);
    });

    it("queries the database once per candidate word", async () => {
        const messages = [
            { cleanContent: "rainbow sunshine beautiful" },
            { cleanContent: "rainbow sunshine" },
        ];
        const db = makeMockDb(2);
        await extractTopics(messages, db, makeMockDictionary());
        const queryMock = vi.mocked(db.query);
        expect(queryMock).toHaveBeenCalledTimes(3);
    });

    it("excludes messages that start with the bot prefix", async () => {
        const messages = [
            { cleanContent: "b!topic" },
            { cleanContent: "b!help" },
            { cleanContent: "beautiful weather today" },
        ];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary(), "b!");
        expect(topics).not.toContain("btopic");
        expect(topics).not.toContain("bhelp");
        expect(topics.length).toBeGreaterThan(0);
    });

    it("includes command messages when no prefix is provided", async () => {
        const messages = [{ cleanContent: "wonderful wonderful wonderful" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics[0]).toBe("wonderful");
    });
});
