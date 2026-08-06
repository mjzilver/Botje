import { makeMessage, makeMockContext } from "@test/helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import pollCommand from "../../commands/poll";
import type { ICommand } from "../../interfaces";

const runPoll = (pollCommand as ICommand).function.bind(pollCommand);

describe("poll command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies usage when question is not wrapped in quotes", async () => {
        const context = makeMockContext();

        await runPoll(makeMessage("!poll no quotes here"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("Usage"));
    });

    it("replies error when fewer than 2 options are given", async () => {
        const context = makeMockContext();

        await runPoll(makeMessage('!poll "Question?" alone'), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("2 options"),
        );
    });

    it("replies error when more than 5 options are given", async () => {
        const context = makeMockContext();

        await runPoll(makeMessage('!poll "Q?" a b c d e f'), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("5 options"),
        );
    });

    it("sends an embed for a valid poll", async () => {
        const context = makeMockContext();

        const sentMsg = makeMessage("poll embed");

        vi.mocked(context.messageHandler.send).mockResolvedValueOnce(sentMsg);

        await runPoll(makeMessage('!poll "Cats or dogs?" cats dogs'), context);

        expect(context.messageHandler.send).toHaveBeenCalledOnce();
    });

    it("reacts with numbered emojis for each option", async () => {
        const context = makeMockContext();

        const sentMsg = makeMessage("poll embed");

        vi.mocked(context.messageHandler.send).mockResolvedValueOnce(sentMsg);

        await runPoll(makeMessage('!poll "Question?" yes no'), context);

        expect(context.messageHandler.react).toHaveBeenCalledTimes(2);
        expect(context.messageHandler.react).toHaveBeenNthCalledWith(1, sentMsg, "1️⃣");
        expect(context.messageHandler.react).toHaveBeenNthCalledWith(2, sentMsg, "2️⃣");
    });

    it("skips reactions when send returns undefined", async () => {
        const context = makeMockContext();
        vi.mocked(context.messageHandler.send).mockResolvedValueOnce(null);

        await runPoll(makeMessage('!poll "Question?" yes no'), context);

        expect(context.messageHandler.react).not.toHaveBeenCalled();
    });
});
