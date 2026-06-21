import { describe, it, expect } from "vitest";
import {
    capitalize,
    isImage,
    isLink,
    normalizeSpaces,
    countVowelGroups,
    textOnly,
    removeQuotes,
    replaceFancyQuotes,
    sanitizeFilename,
    replaceAt,
    makeStringHelpers,
} from "../../utils/helpers/stringHelpers";

describe("capitalize", () => {
    it("capitalizes first letter and lowercases rest", () => {
        expect(capitalize("hello")).toBe("Hello");
        expect(capitalize("WORLD")).toBe("World");
        expect(capitalize("hELLO")).toBe("Hello");
    });
});
describe("isImage", () => {
    it("returns true for image URLs", () => {
        expect(isImage("http://example.com/pic.jpg")).toBe(true);
        expect(isImage("https://example.com/pic.png")).toBe(true);
        expect(isImage("https://example.com/anim.gif")).toBe(true);
    });
    it("returns true for image filenames without protocol", () => {
        expect(isImage("photo.jpeg")).toBe(true);
        expect(isImage("PHOTO.PNG")).toBe(true);
    });
    it("returns false for non-image URLs", () => {
        expect(isImage("http://example.com/page.html")).toBe(false);
        expect(isImage("just text")).toBe(false);
    });
});
describe("isLink", () => {
    it("detects http/https links", () => {
        expect(isLink("https://example.com")).toBe(true);
        expect(isLink("http://foo.bar")).toBe(true);
    });
    it("detects www links (with dot)", () => {
        expect(isLink("www.example.com")).toBe(true);
    });
    it("does not match bare 'www' without a dot", () => {
        expect(isLink("www")).toBe(false);
    });
    it("does not match plain text", () => {
        expect(isLink("just some text")).toBe(false);
    });
});
describe("normalizeSpaces", () => {
    it("collapses multiple spaces", () => {
        expect(normalizeSpaces("hello  world")).toBe("hello world");
    });
    it("trims leading/trailing spaces", () => {
        expect(normalizeSpaces("  hello  ")).toBe("hello");
    });
    it("collapses many spaces to one", () => {
        expect(normalizeSpaces("a     b")).toBe("a b");
    });
});
describe("countVowelGroups", () => {
    it("counts vowel groups as a syllable approximation", () => {
        expect(countVowelGroups("hello")).toBe(2);
        expect(countVowelGroups("beautiful")).toBe(4);
    });
    it("returns 0 for strings with no vowels", () => {
        expect(countVowelGroups("rhythm")).toBe(1);
        expect(countVowelGroups("crwth")).toBe(0);
    });
    it("returns 0 for empty string", () => {
        expect(countVowelGroups("")).toBe(0);
    });
    it("counts consecutive vowels as one group", () => {
        expect(countVowelGroups("feet")).toBe(1);
        expect(countVowelGroups("boat")).toBe(1);
    });
});
describe("textOnly", () => {
    it("removes non-alphabetic characters", () => {
        expect(textOnly("Hello, World!123")).toBe("Hello World");
    });
    it("keeps spaces", () => {
        expect(textOnly("hello world")).toBe("hello world");
    });
});
describe("removeQuotes", () => {
    it("removes double quotes", () => {
        expect(removeQuotes('"hello"')).toBe("hello");
    });
});
describe("replaceFancyQuotes", () => {
    it("replaces smart double quotes", () => {
        expect(replaceFancyQuotes("\u201chello\u201d")).toBe('"hello"');
    });
    it("replaces smart single quotes", () => {
        expect(replaceFancyQuotes("\u2018hello\u2019")).toBe("'hello'");
    });
});
describe("sanitizeFilename", () => {
    it("replaces illegal filename chars with underscore", () => {
        expect(sanitizeFilename("file:name*.txt")).toBe("file_name_.txt");
    });
});
describe("replaceAt", () => {
    it("replaces substring at given index", () => {
        expect(replaceAt("hello", 1, "a")).toBe("hallo");
    });
});
describe("makeStringHelpers", () => {
    const helpers = makeStringHelpers({ prefix: "^(b! ?)" });
    it("removePrefix strips prefix", () => {
        expect(helpers.removePrefix("b! hello")).toBe("hello");
        expect(helpers.removePrefix("b!hello")).toBe("hello");
    });
    it("removeCommand strips prefix + command + trailing space", () => {
        expect(helpers.removeCommand("b!speak about cats")).toBe("about cats");
    });
    it("removeCommands strips first command from start (prefix is ^-anchored)", () => {
        expect(helpers.removeCommands("b!speak about cats")).toBe("about cats");
    });
});
