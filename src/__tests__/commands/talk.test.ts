import { describe, it, expect } from "vitest";
import talkCommand from "../../commands/talk";

describe("talk", () => {
    it("has name 'talk'", () => expect(talkCommand.name).toBe("talk"));
});
