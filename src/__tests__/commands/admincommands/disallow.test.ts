import { describe, expect, it, vi } from "vitest";

vi.mock("fs", () => ({
    default: { readFileSync: vi.fn().mockReturnValue("{}"), writeFile: vi.fn() },
    readFileSync: vi.fn().mockReturnValue("{}"),
    writeFile: vi.fn(),
}));

import { makeMessage, makeMockContext } from "@test/helpers";
import disallowCommand from "../../../commands/admincommands/disallow";

describe("disallow", () => {
    it("sends error when no mention is provided", () => {
        const context = makeMockContext();

        disallowCommand.function(makeMessage("!disallow"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("@ someone"),
        );
    });
});
