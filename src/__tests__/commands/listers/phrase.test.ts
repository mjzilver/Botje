import { describe, it, expect, vi, beforeEach } from "vitest";
import phraseCommand from "../../../commands/listers/phrase";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../../interfaces/discord";

function withMention(content: string, mentionId: string, username: string) {
    const mention = { id: mentionId, username } as BotUser;
    const msg = makeMessage(content);

    msg.mentions = { ...msg.mentions, users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }) };

    return msg;
}

describe("phrase lister", () => {
    beforeEach(() => vi.clearAllMocks());

    it("has name 'phrase'", () => expect(phraseCommand.name).toBe("phrase"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        phraseCommand.function(makeNoGuildMessage("!phrase"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });

    it("sends usage help when no search term is given", () => {
        const context = makeMockContext();

        phraseCommand.function(makeMessage("!phrase"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("phrase"));
    });

    it("counts total occurrences of a word across the guild", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ count: "17" }]);

        phraseCommand.function(makeMessage("!phrase hello"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("17")),
        );
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            expect.arrayContaining(["%hello%", "guild-id"]),
        );
    });

    it("queries leaderboard of who says the word most", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ user_id: "u1", server_id: "guild-id", count: "9" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Lena");
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        phraseCommand.function(makeMessage("!phrase top hello"), context);

        await vi.waitFor(() => expect(context.pagination.sendPaginatedEmbed).toHaveBeenCalled());
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            expect.arrayContaining(["%hello%", "guild-id"]),
        );
    });

    it("counts how many times a mentioned user said a word", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ count: "3" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Mia");

        phraseCommand.function(withMention("!phrase <@user-88> hello", "user-88", "Mia"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("3")),
        );
        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("user_id"),
            expect.arrayContaining(["%hello%", "guild-id", "user-88"]),
        );
    });

    it("counts occurrences of a multi-word quoted phrase", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ count: "2" }]);

        phraseCommand.function(makeMessage('!phrase "hello world"'), context);

        await vi.waitFor(() =>
            expect(context.database.query).toHaveBeenCalledWith(
                expect.stringContaining("ILIKE"),
                expect.arrayContaining(["%hello world%", "guild-id"]),
            ),
        );
    });
});
