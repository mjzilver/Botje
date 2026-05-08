import { describe, it, expect, vi, beforeEach } from "vitest";
import { EmbedBuilder } from "discord.js";
import whoCommand from "../../commands/who";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";

describe("who command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies error when used outside a server", async () => {
        const context = makeMockContext();

        await whoCommand.function(makeNoGuildMessage("!who"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("server"));
    });

    it("replies usage when invoked with no args and no message reference", async () => {
        const context = makeMockContext();

        await whoCommand.function(makeMessage("!who"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("Usage"));
    });

    describe("reply-lookup mode", () => {
        it("replies error when fetching the referenced message fails", async () => {
            const context = makeMockContext();
            const msg = makeMessage("!who");

            Object.assign(msg, { reference: { messageId: "ref-id" } });
            (msg.channel.messages.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("Not found"));

            await whoCommand.function(msg, context);

            expect(context.messageHandler.reply).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("Couldn't fetch"),
            );
        });

        it("replies 'generated' when no DB rows match the referenced content", async () => {
            const context = makeMockContext();
            const msg = makeMessage("!who");

            Object.assign(msg, { reference: { messageId: "ref-id" } });
            (msg.channel.messages.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                content: "hello world",
            });
            vi.mocked(context.database.query).mockResolvedValueOnce([]);

            await whoCommand.function(msg, context);

            expect(context.messageHandler.reply).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("generated"),
            );
        });

        it("sends a single-source embed for one matching row", async () => {
            const context = makeMockContext();
            const msg = makeMessage("!who");

            Object.assign(msg, { reference: { messageId: "ref-id" } });
            (msg.channel.messages.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
                content: "hello world",
            });
            vi.mocked(context.database.query).mockResolvedValueOnce([
                { user_id: "u1", message: "hello world", datetime: "1000000000000" },
            ]);
            vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Alice");

            await whoCommand.function(msg, context);

            expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), expect.any(EmbedBuilder));
        });

        it("sends a multi-source embed for multiple matching rows", async () => {
            const context = makeMockContext();
            const msg = makeMessage("!who");

            Object.assign(msg, { reference: { messageId: "ref-id" } });
            (msg.channel.messages.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ content: "hi there" });
            vi.mocked(context.database.query).mockResolvedValueOnce([
                { user_id: "u1", message: "hi there", datetime: "1000000000000" },
                { user_id: "u2", message: "hi there", datetime: "1000000001000" },
            ]);
            vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("SomeUser");

            await whoCommand.function(msg, context);

            const embed = vi.mocked(context.messageHandler.send).mock.calls[0]?.[1] as EmbedBuilder;

            expect(embed.toJSON().title).toContain("Multiple sources");
        });
    });

    describe("text-search mode", () => {
        it("replies 'No messages found' when no DB rows match", async () => {
            const context = makeMockContext();

            vi.mocked(context.database.query).mockResolvedValueOnce([]);

            await whoCommand.function(makeMessage("!who hello"), context);

            expect(context.messageHandler.reply).toHaveBeenCalledWith(
                expect.anything(),
                expect.stringContaining("No messages found"),
            );
        });

        it("sends a single-match embed when only one occurrence exists", async () => {
            const context = makeMockContext();

            vi.mocked(context.database.query).mockResolvedValueOnce([
                { user_id: "u1", times: "1", sample: "hello there", last_seen: "1000000000000" },
            ]);
            vi.mocked(context.userHandler.getDisplayName).mockResolvedValueOnce("Bob");

            await whoCommand.function(makeMessage("!who hello"), context);

            expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), expect.any(EmbedBuilder));
        });

        it("sends a leaderboard embed when multiple users have matching messages", async () => {
            const context = makeMockContext();

            vi.mocked(context.database.query).mockResolvedValueOnce([
                { user_id: "u1", times: "5", sample: "hello there", last_seen: "1000000000000" },
                { user_id: "u2", times: "3", sample: "hello you", last_seen: "1000000002000" },
            ]);
            vi.mocked(context.userHandler.getDisplayName).mockResolvedValue("User");

            await whoCommand.function(makeMessage("!who hello"), context);

            const embed = vi.mocked(context.messageHandler.send).mock.calls[0]?.[1] as EmbedBuilder;

            expect(embed.toJSON().title).toContain("Who said");
        });
    });
});
