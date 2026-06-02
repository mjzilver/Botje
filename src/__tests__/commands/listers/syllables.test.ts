import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../../systems/queryCache", () => ({
    queryCache: <T>(_key: string, factory: () => Promise<T>) => factory(),
    CacheKey: {
        msgRowsUser: (s: string, u: string) => `msg-rows-user:${s}:${u}`,
        msgRowsServer: (s: string) => `msg-rows-server:${s}`,
    },
}));

import syllablesCommand from "../../../commands/listers/syllables";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../../interfaces/discord";

function withMention(content: string, mentionId: string, username: string) {
    const mention = { id: mentionId, username } as BotUser;
    const msg = makeMessage(content);

    msg.mentions = { ...msg.mentions, users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }) };

    return msg;
}

describe("syllables lister", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies out-of-server error when guild is null", () => {
        const context = makeMockContext();

        syllablesCommand.function(makeNoGuildMessage("!syllables"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command only works in a server.",
        );
    });

    it("calculates average syllables for a mentioned user", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([
            { user_id: "user-66", message: "hello beautiful world" },
            { user_id: "user-66", message: "good morning everyone" },
        ]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Jake");

        syllablesCommand.function(withMention("!syllables @Jake", "user-66", "Jake"), context);

        await vi.waitFor(() =>
            expect(context.messageHandler.send).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringMatching(/Jake.*average.*syllables/i),
            ),
        );
    });

    it("queries server-wide syllable leaderboard when top flag is used", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValueOnce([]);
        vi.mocked(context.pagination.createPages).mockResolvedValueOnce([]);

        syllablesCommand.function(makeMessage("!syllables top"), context);

        await vi.waitFor(() =>
            expect(context.database.query).toHaveBeenCalledWith(
                expect.stringContaining("server_id"),
                expect.arrayContaining(["guild-id"]),
            ),
        );
    });
});
