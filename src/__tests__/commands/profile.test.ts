import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbedBuilder } from "discord.js";
import profileCommand from "../../commands/profile";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { BotUser } from "../../interfaces/discord";

type MessageRow = { message: string; datetime: string };

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

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("server"),
        );
    });

    it("replies when there are fewer than 10 messages stored", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce([]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");

        await profileCommand.function(makeMessage("!profile"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("enough"),
        );
    });

    it("sends an embed when enough messages exist", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce(makeRows(20)).mockResolvedValue([{ cnt: "5" }]);
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

        vi.mocked(context.database.query).mockResolvedValueOnce(makeRows(20)).mockResolvedValue([{ cnt: "5" }]);
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
        vi.mocked(context.database.query).mockResolvedValueOnce(makeRows(20)).mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Other");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(msg, context);

        const [, params] = vi.mocked(context.database.query).mock.calls[0];
        expect(params).toContain("other-user-id");
    });

    it("embed includes Interests and Personality fields", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query).mockResolvedValueOnce(makeRows(20)).mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(makeMessage("!profile"), context);

        const [, payload] = vi.mocked(context.messageHandler.send).mock.calls[0];
        const embed = (payload as { embeds: EmbedBuilder[] }).embeds[0];
        const fieldNames = embed.data.fields?.map((f) => f.name) ?? [];
        expect(fieldNames).toContain("Interests");
        expect(fieldNames).toContain("Personality");
    });

    it("marks personality as inquisitive when most messages are questions", async () => {
        const context = makeMockContext();

        vi.mocked(context.database.query)
            .mockResolvedValueOnce(makeRows(20, { message: "why is this happening today?" }))
            .mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set());

        await profileCommand.function(makeMessage("!profile"), context);

        const [, payload] = vi.mocked(context.messageHandler.send).mock.calls[0];
        const embed = (payload as { embeds: EmbedBuilder[] }).embeds[0];
        const personalityField = embed.data.fields?.find((f) => f.name === "Personality");
        expect(personalityField?.value).toContain("inquisitive");
    });

    it("includes Possible dislikes field when negative messages exist", async () => {
        const context = makeMockContext();
        const rows = makeRows(20, { message: "I hate mornings every single time" });

        vi.mocked(context.database.query).mockResolvedValueOnce(rows).mockResolvedValue([{ cnt: "5" }]);
        vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("Mick");
        vi.mocked(context.dictionary.getStopWords).mockReturnValue(new Set(["every", "single", "time"]));

        await profileCommand.function(makeMessage("!profile"), context);

        const [, payload] = vi.mocked(context.messageHandler.send).mock.calls[0];
        const embed = (payload as { embeds: EmbedBuilder[] }).embeds[0];
        const fieldNames = embed.data.fields?.map((f) => f.name) ?? [];
        expect(fieldNames).toContain("Possible dislikes");
    });
});
