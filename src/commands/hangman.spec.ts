import { describe, it, expect } from "vitest";
import hangmanCommand from "./hangman";
import { makeMockContext } from "../__tests__/helpers/mockContext";
import { makeMessage } from "../__tests__/helpers/mockMessage";

describe("hangman", () => {
    it("has name 'hangman'", () => expect(hangmanCommand.name).toBe("hangman"));

    it("delegates to context.hangman.run", () => {
        const context = makeMockContext();

        hangmanCommand.function(makeMessage("!hangman"), context);

        expect(context.hangman.run).toHaveBeenCalledOnce();
    });
});
