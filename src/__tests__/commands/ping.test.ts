import { describe, it, expect, vi, beforeEach } from "vitest";

import pingCommand from "../../commands/ping";
import type { IBotContext } from "../../interfaces";
import type { BotMessage } from "../../interfaces/discord";

function makeContext(): IBotContext {
    return {
        messageHandler: {
            send: vi.fn().mockResolvedValue(undefined),
            reply: vi.fn().mockResolvedValue(undefined),
            edit: vi.fn().mockResolvedValue(undefined),
        },
    } as unknown as IBotContext;
}

function makeMessage(createdTimestamp = 1000): BotMessage {
    return {
        id: "m1",
        content: "!ping",
        createdTimestamp,
        author: { id: "u1", bot: false },
        channel: { id: "ch1" },
    } as unknown as BotMessage;
}

describe("ping command", () => {
    let context: IBotContext;

    beforeEach(() => {
        context = makeContext();
    });

    it("has name 'ping'", () => {
        expect(pingCommand.name).toBe("ping");
    });

    it("sends 'Ping?' first", async () => {
        await pingCommand.function(makeMessage(), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), "Ping?");
    });

    it("edits the sent message with the latency in ms", async () => {
        const sent = { createdTimestamp: 1100 } as unknown as BotMessage;

        vi.mocked(context.messageHandler.send).mockResolvedValue(sent);

        await pingCommand.function(makeMessage(1000), context);

        expect(context.messageHandler.edit).toHaveBeenCalledWith(sent, expect.stringContaining("100ms"));
    });

    it("does not call edit if send returns undefined", async () => {
        vi.mocked(context.messageHandler.send).mockResolvedValue(undefined);

        await pingCommand.function(makeMessage(), context);

        expect(context.messageHandler.edit).not.toHaveBeenCalled();
    });
});
