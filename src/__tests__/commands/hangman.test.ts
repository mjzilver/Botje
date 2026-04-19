import { describe, it, expect } from "vitest";
import hangmanCommand from "../../commands/hangman";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("hangman", () => {
    it("has name 'hangman'", () => expect(hangmanCommand.name).toBe("hangman"));

    it("delegates to context.hangman.run", () => {
        const context = makeMockContext();

        hangmanCommand.function(makeMessage("!hangman"), context);

        expect(context.hangman.run).toHaveBeenCalledOnce();
    });
});
