import { describe, it, expect, vi } from "vitest";
import type { Client } from "discord.js";

import ageCommand from "../../commands/age";
import type { BotMessage } from "../../interfaces/discord";
import { makeMockContext } from "@test/helpers";

function makeMessage(joinedAt?: Date): BotMessage {
    const member = joinedAt ? { id: "bot-id", joinedAt } : undefined;

    return {
        content: "!age",
        author: { id: "u1", bot: false },
        channel: { id: "ch1" },
        guild: {
            members: {
                cache: {
                    find: (fn: (m: { id: string; joinedAt?: Date }) => boolean) =>
                        member && fn(member) ? member : undefined,
                },
            },
        },
    } as unknown as BotMessage;
}

describe("age command", () => {
    it("has name 'age'", () => {
        expect(ageCommand.name).toBe("age");
    });

    it("replies with the bot's age when joinedAt is available", () => {
        const joined = new Date(Date.now() - 2 * 365 * 24 * 3600 * 1000);
        const context = makeMockContext({ client: { user: { id: "bot-id" } } as unknown as Client });

        ageCommand.function(makeMessage(joined), context);

        const reply = vi.mocked(context.messageHandler.reply).mock.calls[0][1] as string;

        expect(reply).toMatch(/\d+ years/);
        expect(reply).toContain("days");
        expect(reply).toContain("hours");
    });

    it("includes the birthday date in the reply", () => {
        const joined = new Date("2022-03-15T00:00:00Z");
        const context = makeMockContext({ client: { user: { id: "bot-id" } } as unknown as Client });

        ageCommand.function(makeMessage(joined), context);

        const reply = vi.mocked(context.messageHandler.reply).mock.calls[0][1] as string;

        expect(reply).toContain("15");
        expect(reply).toMatch(/March/i);
    });

    it("falls back gracefully when the guild has no member entry", () => {
        const context = makeMockContext({ client: { user: { id: "bot-id" } } as unknown as Client });

        const messageWithNoMember = {
            content: "!age",
            author: { id: "u1", bot: false },
            channel: { id: "ch1" },
            guild: { members: { cache: { find: () => undefined } } },
        } as unknown as BotMessage;

        expect(() => ageCommand.function(messageWithNoMember, context)).not.toThrow();
        expect(context.messageHandler.reply).toHaveBeenCalled();
    });
});
