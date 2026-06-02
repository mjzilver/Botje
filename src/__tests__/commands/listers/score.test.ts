import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../systems/queryCache", () => ({
    queryCache: <T>(_key: string, factory: () => Promise<T>) => factory(),
    CacheKey: {
        scoreUser: (s: string, u: string) => `score-user:${s}:${u}`,
        scoreServer: (s: string) => `score-server:${s}`,
    },
}));

import scoreCommand from "../../../commands/listers/score";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../../interfaces/discord";

function withMention(content: string, mentionId: string, username: string) {
    const mention = { id: mentionId, username } as BotUser;
    const msg = makeMessage(content);

    msg.mentions = { ...msg.mentions, users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }) };

    return msg;
}

describe("score lister", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        scoreCommand.function(makeNoGuildMessage("!score"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });

    it("sends score for a mentioned user", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ user_id: "user-44", total_chars: "12345" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Hank");

        scoreCommand.function(withMention("!score @Hank", "user-44", "Hank"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("12345"),
            ),
        );
    });

    it("sends score of 0 when user has no messages", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Ida");

        scoreCommand.function(withMention("!score @Ida", "user-45", "Ida"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("0")),
        );
    });

    it("queries server leaderboard when top flag is used", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([]);
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        scoreCommand.function(makeMessage("!score top"), context);

        await vi.waitFor(() =>
            expect(context.database.query).toHaveBeenCalledWith(
                expect.stringContaining("SUM(LENGTH(message))"),
                expect.arrayContaining(["guild-id"]),
            ),
        );
    });
});
