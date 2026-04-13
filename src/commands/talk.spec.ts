import { describe, it, expect } from "vitest";
import talkCommand from "./talk";

describe("talk", () => {
    it("has name 'talk'", () => expect(talkCommand.name).toBe("talk"));
});
