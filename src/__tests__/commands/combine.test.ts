import { describe, it, expect } from "vitest";
import combineCommand from "../../commands/combine";

describe("combine", () => {
    it("has name 'combine'", () => expect(combineCommand.name).toBe("combine"));
});
