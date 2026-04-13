import { describe, it, expect } from "vitest";
import memeCommand from "./meme";

describe("meme", () => {
    it("has name 'meme'", () => expect(memeCommand.name).toBe("meme"));
});
