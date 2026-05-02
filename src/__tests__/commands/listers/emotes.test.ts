import { describe, it, expect, vi, beforeEach } from "vitest";
import emotesCommand from "../../../commands/listers/emotes";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../../interfaces/discord";

function withMention(content: string, mentionId: string, username: string) {
    const mention = { id: mentionId, username } as BotUser;
    const msg = makeMessage(content);

    msg.mentions = { ...msg.mentions, users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }) };

    return msg;
}

describe("emotes lister", () => {
    beforeEach(() => vi.clearAllMocks());

    it("has name 'emotes'", () => expect(emotesCommand.name).toBe("emotes"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        emotesCommand.function(makeNoGuildMessage("!emotes"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });

    it("queries top emotes for the guild", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([
            { message: "<:pepe:123>", count: "15" },
            { message: "<:kek:456>", count: "8" },
        ]);
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        emotesCommand.function(makeMessage("!emotes"), context);

        await vi.waitFor(() => expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalled());
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("LIKE"),
            expect.arrayContaining(["guild-id"]),
        );
    });

    it("sends empty-results message when no emotes found", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([]);

        emotesCommand.function(makeMessage("!emotes"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("No emotes found"),
            ),
        );
    });

    it("queries emotes for a mentioned user", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ message: "<:wave:789>", count: "2" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Grace");
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        emotesCommand.function(withMention("!emotes @Grace", "user-33", "Grace"), context);

        await vi.waitFor(() => expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalled());
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("user_id"),
            expect.arrayContaining(["guild-id", "user-33"]),
        );
    });
});
