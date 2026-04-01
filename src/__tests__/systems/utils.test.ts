import { describe, it, expect } from "vitest";
import { levenshtein, findClosestMatchInList, formatUptime, randomBetween, pickRandomItem } from "../../systems/utils";

describe("levenshtein", () => {
    it("returns 0 for identical strings", () => {
        expect(levenshtein("hello", "hello")).toBe(0);
    });
    it("returns length when other string is empty", () => {
        expect(levenshtein("hello", "")).toBe(5);
        expect(levenshtein("", "hello")).toBe(5);
    });
    it("returns 1 for single substitution", () => {
        expect(levenshtein("cat", "bat")).toBe(1);
    });
    it("returns 1 for single insertion", () => {
        expect(levenshtein("cat", "cats")).toBe(1);
    });
    it("returns correct distance for longer strings", () => {
        expect(levenshtein("kitten", "sitting")).toBe(3);
    });
});
describe("findClosestMatchInList", () => {
    it("finds exact match", () => {
        expect(findClosestMatchInList("cat", ["cat", "dog", "bird"])).toBe("cat");
    });
    it("finds closest match by edit distance", () => {
        const result = findClosestMatchInList("cot", ["cat", "dog", "bird"]);
        expect(result).toBe("cat");
    });
    it("returns empty string for empty input", () => {
        expect(findClosestMatchInList("", ["cat"])).toBe("");
    });
    it("works with object word lists", () => {
        const result = findClosestMatchInList("cot", { cat: 5, dog: 3 });
        expect(result).toBe("cat");
    });
    it("case insensitive matching", () => {
        expect(findClosestMatchInList("CAT", ["cat", "dog"])).toBe("cat");
    });
    it("prefers word with lower frequency on equal edit distance (tie-break)", () => {
        const result = findClosestMatchInList("cot", { cat: 10, dot: 2 });
        expect(result).toBe("dot");
    });
    it("handles single element list", () => {
        expect(findClosestMatchInList("hello", ["world"])).toBe("world");
    });
});
describe("formatUptime", () => {
    it("shows only seconds for short durations", () => {
        expect(formatUptime(5000)).toBe("5 seconds");
    });
    it("shows minutes and seconds", () => {
        expect(formatUptime(65000)).toBe("1 minutes and 5 seconds");
    });
    it("shows hours", () => {
        expect(formatUptime(3661000)).toBe("1 hours, 1 minutes and 1 seconds");
    });
    it("shows days", () => {
        expect(formatUptime(86400000 + 3600000)).toBe("1 days, 1 hours, 0 seconds");
    });
});
describe("randomBetween", () => {
    it("returns value within inclusive range", () => {
        for (let i = 0; i < 100; i++) {
            const val = randomBetween(1, 5);
            expect(val).toBeGreaterThanOrEqual(1);
            expect(val).toBeLessThanOrEqual(5);
        }
    });
    it("returns exact value when min equals max", () => {
        expect(randomBetween(3, 3)).toBe(3);
    });
});
describe("pickRandomItem", () => {
    it("returns an item from the array", () => {
        const arr = [1, 2, 3, 4, 5];
        const result = pickRandomItem(arr);
        expect(arr).toContain(result);
    });
    it("throws on empty array", () => {
        expect(() => pickRandomItem([])).toThrow();
    });
});
