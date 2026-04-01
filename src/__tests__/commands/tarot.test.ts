import { describe, it, expect } from "vitest";
import { guessFilename } from "../../commands/tarot";

describe("guessFilename – major arcana", () => {
    it("formats single-digit value with leading zero", () => {
        const result = guessFilename({
            type: "major",
            value_int: 0,
            name: "The Fool",
            name_short: "foo",
            meaning_up: "",
            meaning_rev: "",
        });
        expect(result).toBe("00-TheFool.png");
    });
    it("formats double-digit value normally", () => {
        const result = guessFilename({
            type: "major",
            value_int: 14,
            name: "Temperance",
            name_short: "temp",
            meaning_up: "",
            meaning_rev: "",
        });
        expect(result).toBe("14-Temperance.png");
    });
    it("strips special characters from name", () => {
        const result = guessFilename({
            type: "major",
            value_int: 1,
            name: "The Magician!",
            name_short: "mag",
            meaning_up: "",
            meaning_rev: "",
        });
        expect(result).toBe("01-TheMagician.png");
    });
});
describe("guessFilename – minor arcana", () => {
    it("capitalises suit and pads value", () => {
        const result = guessFilename({
            type: "minor",
            value_int: 3,
            name: "Three of Cups",
            name_short: "cup03",
            suit: "cups",
            meaning_up: "",
            meaning_rev: "",
        });
        expect(result).toBe("Cups03.png");
    });
    it("handles two-digit values", () => {
        const result = guessFilename({
            type: "minor",
            value_int: 14,
            name: "King of Wands",
            name_short: "wand14",
            suit: "wands",
            meaning_up: "",
            meaning_rev: "",
        });
        expect(result).toBe("Wands14.png");
    });
    it("returns null when suit is missing", () => {
        const result = guessFilename({
            type: "minor",
            value_int: 5,
            name: "Five",
            name_short: "five",
            suit: undefined,
            meaning_up: "",
            meaning_rev: "",
        });
        expect(result).toBeNull();
    });
});
