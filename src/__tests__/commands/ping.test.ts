import { makeMessage, makeMockContext } from "@test/helpers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import pingCommand from "../../commands/ping";
import type { IBotContext } from "../../interfaces";
import type { BotMessage } from "../../interfaces/discord";

describe("ping command", () => {
    let context: IBotContext;

    beforeEach(() => {
        context = makeMockContext();
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
        vi.mocked(context.messageHandler.send).mockResolvedValue(null);

        await pingCommand.function(makeMessage("!ping"), context);

        expect(context.messageHandler.edit).not.toHaveBeenCalled();
    });
});
