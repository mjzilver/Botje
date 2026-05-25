import { describe, it, expect, vi } from "vitest";
import { extractTopics, extractNounTokens } from "../../systems/topicExtractor";
import type { IDatabase } from "../../systems/database";
import type { IDictionary } from "../../systems/dictionary";

function makeMockDb(docFreq = 5): IDatabase {
    return {
        query: vi.fn().mockResolvedValue([{ cnt: String(docFreq) }]),
    } as unknown as IDatabase;
}

function makeMockDictionary(): IDictionary {
    return {
        getStopWordsRegex: vi.fn().mockReturnValue(/^$/),
        getStopWords: vi
            .fn()
            .mockReturnValue(new Set(["the", "and", "for", "that", "this", "with", "from", "have", "will", "been"])),
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
        const messages = [{ cleanContent: "weather forecast weather" }, { cleanContent: "beautiful weather today" }];
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
        const messages = [{ cleanContent: "rainbow sunshine beautiful" }, { cleanContent: "rainbow sunshine" }];
        const db = makeMockDb(2);
        await extractTopics(messages, db, makeMockDictionary());
        const queryMock = vi.mocked(db.query);
        expect(queryMock).toHaveBeenCalledTimes(3);
    });

    it("excludes messages that start with a plain prefix", async () => {
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

    it("excludes messages matching a regex-pattern prefix like the production config", async () => {
        const messages = [
            { cleanContent: "b!topic" },
            { cleanContent: "b! weather" },
            { cleanContent: "beautiful sunshine today" },
        ];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary(), "^(b! ?)");
        expect(topics).not.toContain("btopic");
        expect(topics).not.toContain("bweather");
        expect(topics.length).toBeGreaterThan(0);
    });

    it("includes command messages when no prefix is provided", async () => {
        const messages = [{ cleanContent: "weather weather weather" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics[0]).toBe("weather");
    });

    it("does not produce mangled URL words as topics", async () => {
        const messages = [
            { cleanContent: "https://en.wikipedia.org/wiki/something interesting" },
            { cleanContent: "beautiful weather today" },
        ];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics.every((t) => !/https?/.test(t))).toBe(true);
        expect(topics.every((t) => !/wikipedia/.test(t))).toBe(true);
    });

    it("drops command tokens appearing mid-message when prefix is provided", async () => {
        const messages = [{ cleanContent: "lol b!topic is funny" }, { cleanContent: "beautiful sunshine outside" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary(), "b!");
        expect(topics).not.toContain("btopic");
    });
});

describe("noise filtering", () => {
    it("drops URL tokens and prevents letter-mangling into nonsense words", async () => {
        const messages = [
            { cleanContent: "https://en.wikipedia.org/wiki/somethinggreat interesting" },
            { cleanContent: "beautiful weather today" },
        ];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics.every((t) => !/https|wikipedia|somethinggreat/.test(t))).toBe(true);
        expect(topics).toContain("weather");
    });

    it("drops Discord custom emote tokens without leaking the emote name", async () => {
        const messages = [{ cleanContent: "<:smile:123456789> beautiful weather" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics.some((t) => t.includes("smile"))).toBe(false);
        expect(topics).toContain("weather");
    });

    it("drops Discord animated emote tokens without leaking the emote name", async () => {
        const messages = [{ cleanContent: "<a:dance:123456789> sunshine beautiful outside" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics.some((t) => t.includes("dance"))).toBe(false);
        expect(topics).toContain("sunshine");
    });

    it("drops Discord text emote tokens", async () => {
        const messages = [{ cleanContent: "great :thumbsup: beautiful weather" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics).not.toContain("thumbsup");
        expect(topics).toContain("weather");
    });

    it("drops raw Discord user mention tokens", async () => {
        const messages = [{ cleanContent: "<@123456789> sunshine beautiful outside" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics.every((t) => !/\d{6,}/.test(t))).toBe(true);
        expect(topics).toContain("sunshine");
    });

    it("drops raw Discord role mention tokens", async () => {
        const messages = [{ cleanContent: "<@&987654321> sunshine beautiful outside" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics.every((t) => !/\d{6,}/.test(t))).toBe(true);
    });

    it("drops raw Discord channel mention tokens", async () => {
        const messages = [{ cleanContent: "<#555555555> sunshine beautiful outside" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics.every((t) => !/\d{6,}/.test(t))).toBe(true);
    });

    it("drops resolved Discord user mentions starting with @", async () => {
        const messages = [{ cleanContent: "@Username sunshine beautiful outside" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics).not.toContain("username");
        expect(topics).toContain("sunshine");
    });

    it("drops resolved Discord channel mentions starting with #", async () => {
        const messages = [{ cleanContent: "posted in #general sunshine beautiful outside" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics).not.toContain("general");
        expect(topics).toContain("sunshine");
    });

    it("drops bot command tokens appearing mid-message", async () => {
        const messages = [{ cleanContent: "lol b!weather is broken" }, { cleanContent: "beautiful sunshine outside" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary(), "b!");
        expect(topics).not.toContain("bweather");
        expect(topics).toContain("sunshine");
    });

    it("does not filter ordinary words that happen to resemble noise patterns", async () => {
        const messages = [{ cleanContent: "sunshine weather beautiful rainbow" }];
        const topics = await extractTopics(messages, makeMockDb(), makeMockDictionary());
        expect(topics.length).toBeGreaterThan(0);
        expect(topics).toContain("weather");
    });
});

describe("extractNounTokens", () => {
    it("returns only noun tokens from a sentence", () => {
        const words = extractNounTokens("the weather forecast is beautiful today");
        expect(words).toContain("weather");
        expect(words).toContain("forecast");
    });

    it("filters out adverbs like maybe and always", () => {
        const words = extractNounTokens("maybe something happens always");
        expect(words).not.toContain("maybe");
        expect(words).not.toContain("always");
    });

    it("filters out personal pronouns", () => {
        const words = extractNounTokens("i hate that we always do this");
        expect(words).not.toContain("i");
        expect(words).not.toContain("we");
    });

    it("splits multi-word noun phrases into individual tokens", () => {
        const words = extractNounTokens("playing video games is fun");
        const hasGameToken = words.includes("video") || words.includes("games");
        expect(hasGameToken).toBe(true);
    });

    it("lowercases and strips non-letter characters", () => {
        const words = extractNounTokens("Hello-World Testing123");
        expect(words.every((w) => /^[a-z]+$/.test(w))).toBe(true);
    });

    it("filters tokens shorter than four characters", () => {
        const words = extractNounTokens("big dog ran far");
        expect(words.every((w) => w.length >= 4)).toBe(true);
    });

    it("returns empty array for adjective-only input", () => {
        const words = extractNounTokens("wonderful wonderful wonderful");
        expect(words).toEqual([]);
    });

    it("filters indefinite pronouns: something, everything, anything, nothing", () => {
        const words = extractNounTokens("something everything anything nothing happened");
        expect(words).not.toContain("something");
        expect(words).not.toContain("everything");
        expect(words).not.toContain("anything");
        expect(words).not.toContain("nothing");
    });

    it("filters indefinite person pronouns: someone, everyone, anyone, nobody", () => {
        const words = extractNounTokens("someone everyone anyone nobody likes this");
        expect(words).not.toContain("someone");
        expect(words).not.toContain("everyone");
        expect(words).not.toContain("anyone");
        expect(words).not.toContain("nobody");
    });

    it("filters reflexive pronouns: myself, himself, themselves", () => {
        const words = extractNounTokens("myself himself themselves did it");
        expect(words).not.toContain("myself");
        expect(words).not.toContain("himself");
        expect(words).not.toContain("themselves");
    });

    it("does not filter genuine nouns that look similar", () => {
        const words = extractNounTokens("weather music gaming");
        expect(words.length).toBeGreaterThan(0);
    });
});
