import { describe, it, expect, vi } from "vitest";

import rollCommand from "../../commands/roll";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("roll command", () => {
    it("rolls between 0 and the given max when one numeric argument is provided", () => {
        const context = makeMockContext();

        rollCommand.function(makeMessage("!roll 100"), context);

        const reply = vi.mocked(context.messageHandler.reply).mock.calls[0][1] as string;

        expect(reply).toContain("out of 100");
        const rolled = parseInt(reply.match(/rolled (\d+)/)![1]);
        expect(rolled).toBeGreaterThanOrEqual(0);
        expect(rolled).toBeLessThanOrEqual(100);
    });

    it("rolls between min and max when two numeric arguments are provided", () => {
        const context = makeMockContext();

        rollCommand.function(makeMessage("!roll 10 20"), context);

        const reply = vi.mocked(context.messageHandler.reply).mock.calls[0][1] as string;

        expect(reply).toContain("between 10 and 20");
        const rolled = parseInt(reply.match(/rolled (\d+)/)![1]);
        expect(rolled).toBeGreaterThanOrEqual(10);
        expect(rolled).toBeLessThanOrEqual(20);
    });

    it("falls back to a timestamp-based roll when no numeric argument is given", () => {
        const context = makeMockContext();

        rollCommand.function(makeMessage("!roll"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringMatching(/You rolled \d+/),
        );
    });

    it("falls back to timestamp roll when the argument is not a number", () => {
        const context = makeMockContext();

        rollCommand.function(makeMessage("!roll notanumber"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringMatching(/You rolled \d+/),
        );
    });
});
