import { describe, it, expect, vi } from "vitest";

import uptimeCommand from "../../commands/uptime";
import type { IBotContext } from "../../interfaces";
import type { BotMessage } from "../../interfaces/discord";

function makeContext(readyTimestamp: number | null = Date.now() - 3661000): IBotContext {
    return {
        messageHandler: { send: vi.fn() },
        client: { readyTimestamp },
    } as unknown as IBotContext;
}

function makeMessage(): BotMessage {
    return {
        content: "!uptime",
        author: { id: "u1", bot: false },
        channel: { id: "ch1" },
    } as unknown as BotMessage;
}

describe("uptime command", () => {
    it("has name 'uptime'", () => {
        expect(uptimeCommand.name).toBe("uptime");
    });

    it("sends a message containing the formatted uptime", () => {
        const context = makeContext();

        uptimeCommand.function(makeMessage(), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("online for"),
        );
    });

    it("includes hours and minutes in the formatted output for a >1h uptime", () => {
        const context = makeContext(Date.now() - 3661000);

        uptimeCommand.function(makeMessage(), context);

        const msg = vi.mocked(context.messageHandler.send).mock.calls[0][1] as string;

        expect(msg).toMatch(/\d+ hours?/);
        expect(msg).toMatch(/\d+ minutes?/);
    });

    it("handles a null readyTimestamp without throwing", () => {
        const context = makeContext(null);

        expect(() => uptimeCommand.function(makeMessage(), context)).not.toThrow();
        expect(context.messageHandler.send).toHaveBeenCalled();
    });
});
