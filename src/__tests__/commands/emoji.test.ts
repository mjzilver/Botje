import { describe, it, expect } from "vitest";
import emojiCommand from "../../commands/emoji";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("emoji", () => {
    it("has name 'emoji'", () => expect(emojiCommand.name).toBe("emoji"));

    it("sends an emoji string for each letter in non-reply message", async () => {
        const context = makeMockContext();

        await emojiCommand.function(makeMessage("!emoji abc"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), expect.any(String));
    });
});
