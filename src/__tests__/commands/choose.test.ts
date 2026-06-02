import { describe, it, expect, vi } from "vitest";

import chooseCommand from "../../commands/choose";
import { makeMockContext, makeMessage } from "@test/helpers";

describe("choose command", () => {
    it("replies with an error when fewer than two options are given", () => {
        const context = makeMockContext();

        chooseCommand.function(makeMessage("!choose onlyone"), context);

        expect(context.messageHandler.reply).toHaveBeenCalledWith(
            expect.anything(),
            expect.stringContaining("at least two options"),
        );
    });

    it("replies with one of the provided options", () => {
        const context = makeMockContext();

        chooseCommand.function(makeMessage("!choose pizza | pasta"), context);

        const reply = vi.mocked(context.messageHandler.reply).mock.calls[0][1] as string;

        expect(reply).toMatch(/pizza|pasta/);
    });

    it("trims whitespace around option names", () => {
        const context = makeMockContext();

        chooseCommand.function(makeMessage("!choose  cake  |  pie  "), context);

        const reply = vi.mocked(context.messageHandler.reply).mock.calls[0][1] as string;

        expect(reply).toMatch(/cake|pie/);
    });

    it("handles three or more options", () => {
        const context = makeMockContext();

        chooseCommand.function(makeMessage("!choose a | b | c"), context);

        const reply = vi.mocked(context.messageHandler.reply).mock.calls[0][1] as string;

        expect(reply).toMatch(/a|b|c/);
    });
});
