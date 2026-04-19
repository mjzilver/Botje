import { describe, it, expect } from "vitest";
import memeCommand from "../../commands/meme";

describe("meme", () => {
    it("has name 'meme'", () => expect(memeCommand.name).toBe("meme"));
});
