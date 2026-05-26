import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbedBuilder } from "discord.js";
import profileCommand, { sampleMessages, PROFILE_LOOKBACK_MS } from "../../commands/profile";
import type { MessageRow } from "../../commands/profile";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../interfaces/discord";

function makeRows(n: number, overrides?: Partial<MessageRow>): MessageRow[] {
    return Array(n)
        .fill(null)
        .map(() => ({
            message: overrides?.message ?? "what is happening in the world today",
            datetime: overrides?.datetime ?? "1700000000000",
        }));
}

describe("profile command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies error when used outside a server", async () => {
        const context = makeMockContext();

        await profileCommand.function(makeNoGuildMessage("!profile"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("server"));
    });

    it("replies when there are fewer than 10 messages stored", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce([]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");

        await profileCommand.function(makeMessage("!profile"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("enough"));
    });

    it("sends an embed when enough messages exist", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query)
            .mockResolvedValueOnce(makeRows(20))
            .mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(makeMessage("!profile"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.objectContaining({ embeds: [expect.any(EmbedBuilder)] }),
        );
    });

    it("embed title contains the display name", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query)
            .mockResolvedValueOnce(makeRows(20))
            .mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(makeMessage("!profile"), context);

        const [, payload] = vi.mocked(context.messageHandler.send).mock.calls[0];
        const embed = (payload as { embeds: EmbedBuilder[] }).embeds[0];
        expect(embed.data.title).toContain("Mick");
    });

    it("uses the mentioned user id when a mention is given", async () => {
        const context = makeMockContext();
        const msg = makeMessage("!profile @Other");
        const mentioned = { id: "other-user-id", username: "Other" } as BotUser;

        Object.assign(msg.mentions.users, { first: () => mentioned });
        vi.mocked(context.database.query)
            .mockResolvedValueOnce(makeRows(20))
            .mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Other");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(msg, context);

        const [, params] = vi.mocked(context.database.query).mock.calls[0];
        expect(params).toContain("other-user-id");
    });

    it("falls back to the message author when no mention is given", async () => {
        const context = makeMockContext();
        const msg = makeMessage("!profile", { authorId: "self-id" });

        vi.mocked(context.database.query)
            .mockResolvedValueOnce(makeRows(20))
            .mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Self");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(msg, context);

        const [, params] = vi.mocked(context.database.query).mock.calls[0];
        expect(params).toContain("self-id");
    });

    it("passes the server id to the database query", async () => {
        const context = makeMockContext();
        const msg = makeMessage("!profile", { guildId: "srv-123" });

        vi.mocked(context.database.query)
            .mockResolvedValueOnce(makeRows(20))
            .mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(msg, context);

        const [, params] = vi.mocked(context.database.query).mock.calls[0];
        expect(params).toContain("srv-123");
    });

    it("embed includes Interests field", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query)
            .mockResolvedValueOnce(makeRows(20))
            .mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(makeMessage("!profile"), context);

        const [, payload] = vi.mocked(context.messageHandler.send).mock.calls[0];
        const embed = (payload as { embeds: EmbedBuilder[] }).embeds[0];
        const fieldNames = embed.data.fields?.map((f) => f.name) ?? [];
        expect(fieldNames).toContain("Likes");
    });

    it("passes a datetime lookback parameter to the database query", async () => {
        const context = makeMockContext();
        const before = Date.now() - PROFILE_LOOKBACK_MS;

        vi.mocked(context.database.query)
            .mockResolvedValueOnce(makeRows(20))
            .mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(makeMessage("!profile"), context);

        const after = Date.now() - PROFILE_LOOKBACK_MS;
        const [, params] = vi.mocked(context.database.query).mock.calls[0];
        const lookback = (params as unknown[])[2] as number;
        expect(lookback).toBeGreaterThanOrEqual(before - 50);
        expect(lookback).toBeLessThanOrEqual(after + 50);
    });

    it("includes dislikes field when negative messages exist", async () => {
        const context = makeMockContext();
        const rows = makeRows(20, { message: "I hate mornings every single time" });

        vi.mocked(context.database.query).mockResolvedValueOnce(rows);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set(["every", "single", "time"]));

        await profileCommand.function(makeMessage("!profile"), context);

        const [, payload] = vi.mocked(context.messageHandler.send).mock.calls[0];
        const embed = (payload as { embeds: EmbedBuilder[] }).embeds[0];
        const fieldNames = embed.data.fields?.map((f) => f.name) ?? [];
        expect(fieldNames).toContain("Dislikes");
    });

    it("omits dislikes field when no negative messages exist", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query)
            .mockResolvedValueOnce(makeRows(20))
            .mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(makeMessage("!profile"), context);

        const [, payload] = vi.mocked(context.messageHandler.send).mock.calls[0];
        const embed = (payload as { embeds: EmbedBuilder[] }).embeds[0];
        const fieldNames = embed.data.fields?.map((f) => f.name) ?? [];
        expect(fieldNames).not.toContain("Dislikes");
    });
});

describe("sampleMessages", () => {
    function makeRows(n: number): MessageRow[] {
        return Array.from({ length: n }, (_, i) => ({ message: `msg${i}`, datetime: "0" }));
    }

    it("returns the original array when rows <= size", () => {
        const rows = makeRows(10);
        expect(sampleMessages(rows, 50)).toBe(rows);
    });

    it("returns exactly size elements when rows > size", () => {
        const rows = makeRows(1000);
        expect(sampleMessages(rows, 100)).toHaveLength(100);
    });

    it("all returned rows are from the original input", () => {
        const rows = makeRows(200);
        const sample = sampleMessages(rows, 50);
        for (const r of sample) expect(rows).toContain(r);
    });

    it("does not return duplicate rows", () => {
        const rows = makeRows(200);
        const sample = sampleMessages(rows, 50);
        const seen = new Set(sample);
        expect(seen.size).toBe(50);
    });

    it("returns different orderings on repeated calls", () => {
        const rows = makeRows(1000);
        const firstIds = sampleMessages(rows, 100).map((r) => r.message);
        const secondIds = sampleMessages(rows, 100).map((r) => r.message);
        expect(firstIds).not.toEqual(secondIds);
    });
});
