import { describe, it, expect, vi, beforeEach } from "vitest";
import topicCommand from "../../commands/topic";
import { makeMockContext, makeMessage } from "@test/helpers";

vi.mock("../../systems/topicExtractor", () => ({
    fetchTopicsFromContext: vi.fn(),
}));

import { fetchTopicsFromContext } from "../../systems/topicExtractor";

describe("topic command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("sends top topic with related topics when multiple found", async () => {
        vi.mocked(fetchTopicsFromContext).mockResolvedValue(["cats", "dogs", "birds"]);
        const context = makeMockContext();
        const message = makeMessage("!topic");

        await topicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.send)).toHaveBeenCalledWith(
            message,
            "Current topic: **cats** (related: dogs, birds)",
        );
    });

    it("omits related topics when only one topic found", async () => {
        vi.mocked(fetchTopicsFromContext).mockResolvedValue(["cats"]);
        const context = makeMockContext();
        const message = makeMessage("!topic");

        await topicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.send)).toHaveBeenCalledWith(message, "Current topic: **cats**");
    });

    it("sends no-topic fallback when topic list is empty", async () => {
        vi.mocked(fetchTopicsFromContext).mockResolvedValue([]);
        const context = makeMockContext();
        const message = makeMessage("!topic");

        await topicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.send)).toHaveBeenCalledWith(
            message,
            "No clear topic in recent messages.",
        );
    });

    it("sends error fallback and logs when fetch throws", async () => {
        const error = new Error("fetch failed");
        vi.mocked(fetchTopicsFromContext).mockRejectedValue(error);
        const context = makeMockContext();
        const message = makeMessage("!topic");

        await topicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.send)).toHaveBeenCalledWith(message, "Couldn't read recent messages.");
        expect(vi.mocked(context.logger.error)).toHaveBeenCalledWith(error);
    });
});
