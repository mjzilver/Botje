import { describe, it, expect, vi } from "vitest";
import askCommand from "../../../commands/ask";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("ask — integration", () => {
    it("replies Thinking..., calls llm, then reacts on success", async () => {
        const context = makeMockContext();
        const thinkingMsg = { id: "thinking-msg" };
        vi.mocked(context.messageHandler.reply).mockResolvedValue(thinkingMsg as never);
        vi.mocked(context.llm.streamToMessage).mockResolvedValue("Hello!");

        await askCommand.function(makeMessage("!ask what is 2+2"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), "Thinking...");
        expect(context.llm.streamToMessage).toHaveBeenCalledWith(thinkingMsg, expect.any(String), expect.any(Function));
        expect(context.messageHandler.react).toHaveBeenCalledWith(thinkingMsg, "🤖");
    });

    it("edits to error message when llm throws", async () => {
        const context = makeMockContext();
        const thinkingMsg = { id: "thinking-msg" };
        vi.mocked(context.messageHandler.reply).mockResolvedValue(thinkingMsg as never);
        vi.mocked(context.llm.streamToMessage).mockRejectedValue(new Error("LLM unavailable"));

        await askCommand.function(makeMessage("!ask something"), context);

        expect(context.messageHandler.edit).toHaveBeenCalledWith(thinkingMsg, expect.stringContaining("Error"));
        expect(context.messageHandler.react).not.toHaveBeenCalled();
    });

    it("does nothing if messageHandler.reply returns undefined", async () => {
        const context = makeMockContext();
        vi.mocked(context.messageHandler.reply).mockResolvedValue(undefined);

        await askCommand.function(makeMessage("!ask hello"), context);

        expect(context.llm.streamToMessage).not.toHaveBeenCalled();
    });
});
