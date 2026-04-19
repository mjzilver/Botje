import { describe, it, expect } from "vitest";
import matchCommand from "../../commands/match";
import type { ICommand } from "../../interfaces";

describe("match", () => {
    it("has name 'match'", () => expect(matchCommand.name).toBe("match"));

    it("is disabled", () => expect((matchCommand as ICommand & { disabled?: boolean }).disabled).toBe(true));
});
