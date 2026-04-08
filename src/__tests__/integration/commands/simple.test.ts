import { describe, it, expect, vi } from "vitest";
import pingCommand from "../../../commands/ping";
import rollCommand from "../../../commands/roll";
import chooseCommand from "../../../commands/choose";
import { makeMockContext } from "../../helpers/mockContext";
import { makeMessage } from "../../helpers/mockMessage";

describe("ping — integration", () => {
    it("sends Ping? and then edits with latency", async () => {
        const context = makeMockContext();
        const sentMsg = { createdTimestamp: Date.now() + 50 };
        vi.mocked(context.messageHandler.send).mockResolvedValue(sentMsg as never);

        await pingCommand.function(makeMessage("!ping"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), "Ping?");
        expect(context.messageHandler.edit).toHaveBeenCalledWith(sentMsg, expect.stringContaining("ms"));
    });
});

describe("roll — integration", () => {
    it("replies with a number in the given range", () => {
        const context = makeMockContext();

        rollCommand.function(makeMessage("!roll 1 6"), context);

        const reply = vi.mocked(context.messageHandler.reply).mock.calls[0][1] as string;
        const rolled = parseInt(reply.match(/rolled (\d+)/)![1]);
        expect(rolled).toBeGreaterThanOrEqual(1);
        expect(rolled).toBeLessThanOrEqual(6);
    });

    it("replies with a number when only max is given", () => {
        const context = makeMockContext();

        rollCommand.function(makeMessage("!roll 100"), context);

        const reply = vi.mocked(context.messageHandler.reply).mock.calls[0][1] as string;
        expect(reply).toContain("out of 100");
    });
});

describe("choose — integration", () => {
    it("replies with one of the provided options", () => {
        const context = makeMockContext();

        chooseCommand.function(makeMessage("!choose apple|orange|banana"), context);

        const reply = vi.mocked(context.messageHandler.reply).mock.calls[0][1] as string;
        expect(["apple", "orange", "banana"].some((opt) => reply.includes(opt))).toBe(true);
    });

    it("replies with an error when no options are provided", () => {
        const context = makeMockContext();

        chooseCommand.function(makeMessage("!choose singleoption"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("at least two"),
        );
    });
});
