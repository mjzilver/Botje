import { describe, it, expect, vi } from "vitest";

vi.mock("fs", () => ({
    default: { readFileSync: vi.fn().mockReturnValue("{}"), writeFile: vi.fn() },
    readFileSync: vi.fn().mockReturnValue("{}"),
    writeFile: vi.fn(),
}));

import disallowCommand from "../../../commands/admincommands/disallow";
import { makeMockContext, makeMessage } from "@test/helpers";

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
