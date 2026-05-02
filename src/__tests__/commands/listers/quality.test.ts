import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../systems/queryCache", () => ({
    queryCache: <T>(_key: string, factory: () => Promise<T>) => factory(),
    CacheKey: {
        qualityUser: (s: string, u: string) => `quality-user:${s}:${u}`,
        qualityServer: (s: string) => `quality-server:${s}`,
    },
}));

import qualityCommand from "../../../commands/listers/quality";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../../interfaces/discord";

function withMention(content: string, mentionId: string, username: string) {
    const mention = { id: mentionId, username } as BotUser;
    const msg = makeMessage(content);

    msg.mentions = { ...msg.mentions, users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }) };

    return msg;
}

describe("quality lister", () => {
    beforeEach(() => vi.clearAllMocks());

    it("has name 'quality'", () => expect(qualityCommand.name).toBe("quality"));

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        qualityCommand.function(makeNoGuildMessage("!quality"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });

    it("reports quality percentage for a mentioned user", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([{ user_id: "user-11", percentage_unique: "72.5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Eve");

        qualityCommand.function(withMention("!quality @Eve", "user-11", "Eve"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("72.50%"),
            ),
        );
    });

    it("sends not-enough-messages message when DB returns empty for a mention", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Frank");

        qualityCommand.function(withMention("!quality @Frank", "user-12", "Frank"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("not have enough qualifying messages"),
            ),
        );
    });

    it("queries leaderboard when top flag is used", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([]);
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        qualityCommand.function(makeMessage("!quality top"), context);

        await vi.waitFor(() =>
            expect(context.database.query).toHaveBeenCalledWith(
                expect.stringContaining("percentage_unique"),
                expect.arrayContaining(["guild-id"]),
            ),
        );
    });
});
