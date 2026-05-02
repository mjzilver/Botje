import { describe, it, expect, vi, beforeEach } from "vitest";
import saidCommand from "../../../commands/listers/said";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../../interfaces/discord";

function withMention(content: string, mentionId: string, username: string) {
    const mention = { id: mentionId, username } as BotUser;
    const msg = makeMessage(content);

    msg.mentions = { ...msg.mentions, users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }) };

    return msg;
}

describe("said lister", () => {
    beforeEach(() => vi.clearAllMocks());

    it("has name 'said'", () => expect(saidCommand.name).toBe("said"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        saidCommand.function(makeNoGuildMessage("!said"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });

    it("queries most repeated phrases for the guild", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([
            { message: "hello world", count: "5" },
            { message: "good morning", count: "3" },
        ]);
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        saidCommand.function(makeMessage("!said"), context);

        await vi.waitFor(() => expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalled());
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("GROUP BY"),
            expect.arrayContaining(["guild-id"]),
        );
    });

    it("sends empty-results message when no repeated phrases exist", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([]);

        saidCommand.function(makeMessage("!said"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("No repeated phrases"),
            ),
        );
    });

    it("queries top phrases for a mentioned user", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ message: "hi there", count: "4" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Bob");

        saidCommand.function(withMention("!said @Bob", "user-99", "Bob"), context);

        await vi.waitFor(() => expect(context.messageHandler.send).toHaveBeenCalled());
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("user_id"),
            expect.arrayContaining(["guild-id", "user-99"]),
        );
    });
});
