import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbedBuilder } from "discord.js";
import quoteCommand from "../../commands/quote";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../interfaces/discord";

function withMention(content: string, mentionId: string) {
    const mention = { id: mentionId, username: "MentionedUser" } as BotUser;
    const msg = makeMessage(content);

    msg.mentions = {
        ...msg.mentions,
        users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }),
    };

    return msg;
}

describe("quote command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies error when used outside a server", async () => {
        const context = makeMockContext();

        await quoteCommand.function(makeNoGuildMessage("!quote"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("server"));
    });

    it("sends a random-quote embed with author and date in footer", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce([
            { id: "1", user_id: "u1", message: "This is a great quote.", datetime: "1000000000000" },
        ]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Alice");

        await quoteCommand.function(makeMessage("!quote"), context);

        const embed = vi.mocked(context.messageHandler.send).mock.calls[0]?.[1] as EmbedBuilder;

        expect(embed).toBeInstanceOf(EmbedBuilder);
        expect(embed.toJSON().footer?.text).toContain("Alice");
    });

    it("includes the user's ID in the query when a mention is given", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce([
            { id: "2", user_id: "u99", message: "Hello!", datetime: "1000000000000" },
        ]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Bob");

        await quoteCommand.function(withMention("!quote @Bob", "u99"), context);

        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("user_id"),
            expect.arrayContaining(["u99"]),
        );
    });

    it("uses ILIKE in the query when a keyword is given", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce([
            { id: "3", user_id: "u1", message: "funny cats rule", datetime: "1000000000000" },
        ]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Alice");

        await quoteCommand.function(makeMessage("!quote cats"), context);

        expect(context.database.query).toHaveBeenCalledWith(
            expect.stringContaining("ILIKE"),
            expect.arrayContaining([expect.stringContaining("cats")]),
        );
    });

    it("replies 'No messages found' when no rows are returned", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce([]);

        await quoteCommand.function(makeMessage("!quote"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("No messages found"),
        );
    });

    it("includes the keyword in the reply when a keyword search returns nothing", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce([]);

        await quoteCommand.function(makeMessage("!quote dragons"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("dragons"),
        );
    });
});
