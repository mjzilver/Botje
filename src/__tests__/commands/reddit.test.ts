import { describe, expect, it } from "vitest";
import { buildRedditUrl, parseRedditArgs } from "../../commands/reddit";

describe("buildRedditUrl", () => {
    it("builds a basic URL with defaults", () => {
        const url = buildRedditUrl("cats", "hot", "month");
        expect(url).toBe("https://www.reddit.com/r/cats/hot/");
    });

    it("omits the time query for non-top sorts", () => {
        expect(buildRedditUrl("pics", "new", "day")).toBe("https://www.reddit.com/r/pics/new/");
    });

    it("puts sort in the path and time in the query for top", () => {
        const url = buildRedditUrl("worldnews", "top", "year");
        expect(url).toBe("https://www.reddit.com/r/worldnews/top/?t=year");
    });
});

describe("parseRedditArgs", () => {
    it("defaults sort to hot and time to month", () => {
        const result = parseRedditArgs("!reddit cats");
        expect(result).toEqual({ sub: "cats", sort: "hot", time: "month" });
    });

    it("picks up valid sort argument", () => {
        const result = parseRedditArgs("!reddit cats top");
        expect(result.sort).toBe("top");
    });

    it("picks up valid time argument", () => {
        const result = parseRedditArgs("!reddit cats top week");
        expect(result.time).toBe("week");
    });

    it("ignores invalid sort values", () => {
        const result = parseRedditArgs("!reddit cats best");
        expect(result.sort).toBe("hot");
    });

    it("ignores invalid time values", () => {
        const result = parseRedditArgs("!reddit cats top forever");
        expect(result.time).toBe("month");
    });

    it("accepts all valid sort options", () => {
        for (const sort of ["hot", "top", "new"]) {
            const result = parseRedditArgs(`!reddit cats ${sort}`);
            expect(result.sort).toBe(sort);
        }
    });

    it("accepts all valid time options", () => {
        for (const time of ["hour", "day", "week", "month", "year", "all"]) {
            const result = parseRedditArgs(`!reddit cats top ${time}`);
            expect(result.time).toBe(time);
        }
    });

    it("returns empty string for missing subreddit", () => {
        const result = parseRedditArgs("!reddit");
        expect(result.sub).toBe("");
    });
});
