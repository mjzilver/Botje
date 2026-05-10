import { describe, it, expect, vi, beforeEach } from "vitest";
import { Lister } from "../../../commands/listers/lister";
import { makeMockContext, makeMessage } from "@test/helpers";
import type { GuildBotMessage } from "../../../interfaces/discord";

class StubLister extends Lister {}

describe("Lister base class – fallback methods", () => {
    beforeEach(() => vi.clearAllMocks());

    const guildMsg = () => makeMessage("!test") as unknown as GuildBotMessage;

    it("total replies 'does not work without further commands'", () => {
        const context = makeMockContext();

        new StubLister().total(guildMsg(), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command does not work without further commands",
        );
    });

    it("mention replies 'does not work with @'", () => {
        const context = makeMockContext();

        new StubLister().mention(guildMsg(), { id: "u1" }, context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command does not work with @",
        );
    });

    it("perPerson replies 'does not work with ?'", () => {
        const context = makeMockContext();

        new StubLister().perPerson(guildMsg(), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command does not work with ?",
        );
    });

    it("percentage replies 'does not work with %'", () => {
        const context = makeMockContext();

        new StubLister().percentage(guildMsg(), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            "This command does not work with %",
        );
    });
});
