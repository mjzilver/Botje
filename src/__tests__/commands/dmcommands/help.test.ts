import { makeMessage, makeMockContext } from "@test/helpers";
import { describe, expect, it } from "vitest";
import dmHelpCommand from "../../../commands/dmcommands/help";

describe("dmcommands/help", () => {
    it("sends an embed to the user", () => {
        const context = makeMockContext();

        dmHelpCommand.function(makeMessage("!help"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ embeds: expect.any(Array) }),
        );
    });
});
