import { describe, it, expect } from "vitest";
import nukeCommand from "../../../commands/admincommands/nuke";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("nuke", () => {
    it("sends rejection message to non-owner", async () => {
        const context = makeMockContext();

        await nukeCommand.function(makeMessage("!nuke", { authorId: "not-owner-id" }), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("server owner"),
        );
    });
});
