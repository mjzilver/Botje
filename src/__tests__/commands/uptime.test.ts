import { describe, it, expect, vi } from "vitest";
import type { Client } from "discord.js";

import uptimeCommand from "../../commands/uptime";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("uptime command", () => {
    it("has name 'uptime'", () => {
        expect(uptimeCommand.name).toBe("uptime");
    });

    it("sends a message containing the formatted uptime", () => {
        const context = makeMockContext({ client: { readyTimestamp: Date.now() - 3661000 } as unknown as Client });

        uptimeCommand.function(makeMessage("!uptime"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("online for"),
        );
    });

    it("includes hours and minutes in the formatted output for a >1h uptime", () => {
        const context = makeMockContext({ client: { readyTimestamp: Date.now() - 3661000 } as unknown as Client });

        uptimeCommand.function(makeMessage("!uptime"), context);

        const msg = vi.mocked(context.messageHandler.send).mock.calls[0][1] as string;

        expect(msg).toMatch(/\d+ hours?/);
        expect(msg).toMatch(/\d+ minutes?/);
    });

    it("handles a null readyTimestamp without throwing", () => {
        const context = makeMockContext({ client: { readyTimestamp: null } as unknown as Client });

        expect(() => uptimeCommand.function(makeMessage("!uptime"), context)).not.toThrow();
        expect(context.messageHandler.send).toHaveBeenCalled();
    });
});
