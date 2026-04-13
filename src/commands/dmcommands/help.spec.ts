import { describe, it, expect } from "vitest";
import dmHelpCommand from "./help";
import { makeMockContext } from "../../__tests__/helpers/mockContext";
import { makeMessage } from "../../__tests__/helpers/mockMessage";

describe("dmcommands/help", () => {
    it("has name 'help'", () => expect(dmHelpCommand.name).toBe("help"));

    it("sends an embed to the user", () => {
        const context = makeMockContext();

        dmHelpCommand.function(makeMessage("!help"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ embeds: expect.any(Array) }),
        );
    });
});
