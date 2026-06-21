import { describe, it, expect, vi, beforeEach } from "vitest";
import topicCommand from "../../commands/topic";
import { makeMockContext, makeMessage } from "@test/helpers";

vi.mock("../../features/nlp/topicExtractor", () => ({
    tryFetchTopics: vi.fn(),
}));

import { tryFetchTopics } from "../../features/nlp/topicExtractor";

describe("topic command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("sends top topic with related topics when multiple found", async () => {
        vi.mocked(tryFetchTopics).mockResolvedValue(["cats", "dogs", "birds"]);
        const context = makeMockContext();
        const message = makeMessage("!topic");

        await topicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.send)).toHaveBeenCalledWith(
            message,
            "Current topic: **cats** (related: dogs, birds)",
        );
    });

    it("omits related topics when only one topic found", async () => {
        vi.mocked(tryFetchTopics).mockResolvedValue(["cats"]);
        const context = makeMockContext();
        const message = makeMessage("!topic");

        await topicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.send)).toHaveBeenCalledWith(message, "Current topic: **cats**");
    });

    it("sends no-topic fallback when topic list is empty", async () => {
        vi.mocked(tryFetchTopics).mockResolvedValue([]);
        const context = makeMockContext();
        const message = makeMessage("!topic");

        await topicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.send)).toHaveBeenCalledWith(
            message,
            "No clear topic in recent messages.",
        );
    });

    it("sends error fallback when fetch returns undefined", async () => {
        vi.mocked(tryFetchTopics).mockResolvedValue(undefined);
        const context = makeMockContext();
        const message = makeMessage("!topic");

        await topicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.send)).toHaveBeenCalledWith(message, "Couldn't read recent messages.");
    });
});
