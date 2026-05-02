import { describe, it, expect, vi, beforeEach } from "vitest";
import countCommand from "../../../commands/listers/count";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../../interfaces/discord";

function withMention(content: string, mentionId: string, username: string) {
    const mention = { id: mentionId, username } as BotUser;
    const msg = makeMessage(content);

    msg.mentions.users.set(mentionId, mention);
    msg.mentions = { ...msg.mentions, users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }) };

    return msg;
}

describe("count lister", () => {
    beforeEach(() => vi.clearAllMocks());

    it("has name 'count'", () => expect(countCommand.name).toBe("count"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        countCommand.function(makeNoGuildMessage("!count"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });

    it("queries total message count for the guild", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ count: "42" }]);

        countCommand.function(makeMessage("!count"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("42")),
        );
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("COUNT(*)"),
            expect.arrayContaining(["guild-id"]),
        );
    });

    it("queries message count for a mentioned user", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ count: "7" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Alice");

        countCommand.function(withMention("!count @Alice", "user-99", "Alice"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("7")),
        );
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("user_id"),
            expect.arrayContaining(["guild-id", "user-99"]),
        );
    });

    it("queries per-person breakdown when leaderboard flag is used", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([]);
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        countCommand.function(makeMessage("!count top"), context);

        await vi.waitFor(() =>
            expect(context.database.query).toHaveBeenCalledWith(
                expect.stringContaining("GROUP BY"),
                expect.arrayContaining(["guild-id"]),
            ),
        );
    });
});
