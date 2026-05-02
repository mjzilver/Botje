import { describe, it, expect, vi, beforeEach } from "vitest";
import emojiCommand from "../../commands/emoji";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("emoji", () => {
    beforeEach(() => vi.clearAllMocks());

    it("has name 'emoji'", () => expect(emojiCommand.name).toBe("emoji"));

    it("sends an emoji string for each letter in a normal message", async () => {
        const context = makeMockContext();

        await emojiCommand.function(makeMessage("!emoji abc"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), expect.any(String));
    });

    it("sends empty string when no text is provided", async () => {
        const context = makeMockContext();

        await emojiCommand.function(makeMessage("!emoji"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), "");
    });

    it("reacts to the referenced message letter-by-letter in reply mode", async () => {
        const context = makeMockContext();
        const replyMsg = makeMessage("some message", { id: "reply-msg-id" });
        const msg = makeMessage("!emoji hi", { id: "cmd-msg-id" });
        msg.type = 19;
        msg.reference = { messageId: "reply-msg-id" };
        vi.mocked(msg.channel.messages.fetch).mockResolvedValue(replyMsg as never);

        await emojiCommand.function(msg, context);

        expect(context.messageHandler.react).toHaveBeenCalled();
        expect(context.messageHandler.send).not.toHaveBeenCalled();
    });
});
