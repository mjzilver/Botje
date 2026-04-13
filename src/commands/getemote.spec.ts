import { describe, it, expect } from "vitest";
import getemoteCommand from "./getemote";

describe("getemote", () => {
    it("has name 'getemote'", () => expect(getemoteCommand.name).toBe("getemote"));
});
