import { describe, it, expect, vi, beforeEach } from "vitest";
import repliesCommand from "../../../commands/listers/replies";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../../interfaces/discord";

function withMention(content: string, mentionId: string, username: string) {
    const mention = { id: mentionId, username } as BotUser;
    const msg = makeMessage(content);

    msg.mentions = { ...msg.mentions, users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }) };

    return msg;
}

describe("replies lister", () => {
    beforeEach(() => vi.clearAllMocks());

    it("has name 'replies'", () => expect(repliesCommand.name).toBe("replies"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        repliesCommand.function(makeNoGuildMessage("!replies"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });

    it("queries reply relationships for the guild", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ from_user: "u1", to_user: "u2", count: "8" }]);
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        repliesCommand.function(makeMessage("!replies"), context);

        await vi.waitFor(() => expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalled());
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("reply_to"),
            expect.arrayContaining(["guild-id"]),
        );
    });

    it("sends empty-results message when no reply relationships exist", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([]);

        repliesCommand.function(makeMessage("!replies"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("No reply relationships found"),
            ),
        );
    });

    it("queries who a mentioned user replies to most", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ to_user: "user-56", count: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Dave");
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        repliesCommand.function(withMention("!replies @Dave", "user-55", "Dave"), context);

        await vi.waitFor(() => expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalled());
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("reply_to"),
            expect.arrayContaining(["guild-id", "user-55"]),
        );
    });
});
