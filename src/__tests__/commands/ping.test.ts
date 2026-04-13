import { describe, it, expect, vi, beforeEach } from "vitest";

import pingCommand from "../../commands/ping";
import type { IBotContext } from "../../interfaces";
import type { BotMessage } from "../../interfaces/discord";
import { makeMockContext } from "../helpers/mockContext";
import { makeMessage } from "../helpers/mockMessage";

describe("ping command", () => {
    let context: IBotContext;

    beforeEach(() => {
        context = makeMockContext();
    });

    it("has name 'ping'", () => {
        expect(pingCommand.name).toBe("ping");
    });

    it("sends 'Ping?' first", async () => {
        await pingCommand.function(makeMessage("!ping"), context);

        expect(context.messageHandler.send).toHaveBeenCalledWith(expect.anything(), "Ping?");
    });

    it("edits the sent message with the latency in ms", async () => {
        const sent = { createdTimestamp: 1100 } as unknown as BotMessage;

        vi.mocked(context.messageHandler.send).mockResolvedValue(sent);

        await pingCommand.function(makeMessage("!ping", { createdTimestamp: 1000 }), context);

        expect(context.messageHandler.edit).toHaveBeenCalledWith(sent, expect.stringContaining("100ms"));
    });

    it("does not call edit if send returns undefined", async () => {
        vi.mocked(context.messageHandler.send).mockResolvedValue(undefined);

        await pingCommand.function(makeMessage("!ping"), context);

        expect(context.messageHandler.edit).not.toHaveBeenCalled();
    });
});
