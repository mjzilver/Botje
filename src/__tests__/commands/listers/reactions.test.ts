import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../systems/queryCache", () => ({
    queryCache: <T>(_key: string, factory: () => Promise<T>) => factory(),
    CacheKey: {
        reactionsServer: (s: string) => `reactions-server:${s}`,
        reactionsMentionUser: (s: string, u: string) => `reactions-mention:${s}:${u}`,
        reactionsPerPerson: (s: string) => `reactions-per-person:${s}`,
    },
}));

import reactionsCommand from "../../../commands/listers/reactions";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../../interfaces/discord";

function withMention(content: string, mentionId: string, username: string) {
    const mention = { id: mentionId, username } as BotUser;
    const msg = makeMessage(content);

    msg.mentions = { ...msg.mentions, users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }) };

    return msg;
}

describe("reactions lister", () => {
    beforeEach(() => vi.clearAllMocks());

    it("has name 'reactions'", () => expect(reactionsCommand.name).toBe("reactions"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        reactionsCommand.function(makeNoGuildMessage("!reactions"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });

    it("queries top reactions for the guild", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([
            { emoji: "👍", count: "10" },
            { emoji: "❤️", count: "7" },
        ]);
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        reactionsCommand.function(makeMessage("!reactions"), context);

        await vi.waitFor(() => expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalled());
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("reactions"),
            expect.arrayContaining(["guild-id"]),
        );
    });

    it("sends empty-results message when no reactions exist", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([]);

        reactionsCommand.function(makeMessage("!reactions"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("No reactions found"),
            ),
        );
    });

    it("queries reactions for a mentioned user", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ emoji: "🔥", count: "3" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Carol");
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        reactionsCommand.function(withMention("!reactions @Carol", "user-77", "Carol"), context);

        await vi.waitFor(() => expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalled());
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("user_id"),
            expect.arrayContaining(["guild-id", "user-77"]),
        );
    });

    it("queries per-person reaction breakdown for leaderboard flag", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce([{ user_id: "u1", server_id: "guild-id", count: "9" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Dan");
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        reactionsCommand.function(makeMessage("!reactions top"), context);

        await vi.waitFor(() => expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalled());
    });

    it("replies 'does not work with %' for the percent flag", async () => {
        const context = makeMockContext();

        reactionsCommand.function(makeMessage("!reactions percent"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.reply).toHaveBeenCalledWith(
                expect.anything(),
                "This command does not work with %",
            ),
        );
    });
});
