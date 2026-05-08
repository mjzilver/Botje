import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../../systems/botContext");

import remindCommand from "../../commands/remind";
import { getBotContext } from "../../systems/botContext";
import { makeMockContext, makeMessage } from "@test/helpers";
import type { ICommand } from "../../interfaces";
import type { SystemRegistry } from "../../systems/systemRegistry";

const runRemind = (remindCommand as ICommand).function.bind(remindCommand);

describe("remind command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies usage when fewer than 2 args are given", async () => {
        const context = makeMockContext();

        vi.mocked(getBotContext).mockReturnValue(context as unknown as SystemRegistry);

        await runRemind(makeMessage("!remind"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("Usage"));
    });

    it("replies format error for an invalid duration string", async () => {
        const context = makeMockContext();

        vi.mocked(getBotContext).mockReturnValue(context as unknown as SystemRegistry);

        await runRemind(makeMessage("!remind soon feed the cat"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("Invalid duration"),
        );
    });

    it("replies cap message when duration exceeds 24 hours", async () => {
        const context = makeMockContext();

        vi.mocked(getBotContext).mockReturnValue(context as unknown as SystemRegistry);

        await runRemind(makeMessage("!remind 25h too long"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("24 hours"),
        );
    });

    it("schedules reminder and confirms in seconds", async () => {
        const context = makeMockContext();

        vi.mocked(getBotContext).mockReturnValue(context as unknown as SystemRegistry);
        vi.mocked(context.reminderScheduler.schedule).mockResolvedValueOnce(undefined);

        await runRemind(makeMessage("!remind 30s water the plants"), context);

        expect(context.reminderScheduler.schedule).toHaveBeenCalledOnce();
        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("second"));
    });

    it("confirms reminder with 'minute(s)' for a minute-based duration", async () => {
        const context = makeMockContext();

        vi.mocked(getBotContext).mockReturnValue(context as unknown as SystemRegistry);
        vi.mocked(context.reminderScheduler.schedule).mockResolvedValueOnce(undefined);

        await runRemind(makeMessage("!remind 15m stand up"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("minute"));
    });

    it("confirms reminder with 'hour(s)' for an hour-based duration", async () => {
        const context = makeMockContext();

        vi.mocked(getBotContext).mockReturnValue(context as unknown as SystemRegistry);
        vi.mocked(context.reminderScheduler.schedule).mockResolvedValueOnce(undefined);

        await runRemind(makeMessage("!remind 2h call mum"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(expect.anything(), expect.stringContaining("hour"));
    });
});
