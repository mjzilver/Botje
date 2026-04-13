import { describe, it, expect } from "vitest";
import combineCommand from "./combine";

describe("combine", () => {
    it("has name 'combine'", () => expect(combineCommand.name).toBe("combine"));
});
