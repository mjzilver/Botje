import { describe, it, expect, vi, beforeEach } from "vitest";
import mimicCommand from "../../commands/mimic";
import { makeMockContext, makeMessage, makeNoGuildMessage } from "@test/helpers";
import type { CachedProfile } from "../../systems/mimicBuilder";

vi.mock("../../systems/mimicCache", () => ({
    mimicCache: {
        get: vi.fn(),
        isExpired: vi.fn(),
        enqueue: vi.fn(),
        enqueueWithProfile: vi.fn().mockResolvedValue(undefined),
    },
}));

vi.mock("../../systems/mimicBuilder", async (importOriginal) => {
    const real = await importOriginal<typeof import("../../systems/mimicBuilder")>();

    return {
        ...real,
        isEligibleMimicTarget: vi.fn(() => true),
        cleanMessage: vi.fn((msg: string) => msg),
        buildStyleProfile: vi.fn(() => ({ targetWordCount: 10, prefersLowercase: false, terminator: "." })),
        buildChain: vi.fn(() => ({ chain: {}, starts: [["Hello", "there"]] as [string, string][] })),
        generate: vi.fn(() => "mocked generated text"),
        isVerbatimRepeat: vi.fn(() => false),
        MIN_MESSAGES: 2,
        MAX_RETRIES: 5,
    };
});

import { mimicCache } from "../../systems/mimicCache";

const STALE_PROFILE: CachedProfile = {
    chain: {},
    starts: [["Hello", "world"]] as [string, string][],
    style: { targetWordCount: 10, prefersLowercase: false, terminator: "." },
    builtAt: Date.now() - 30 * 24 * 60 * 60 * 1000,
    messageCount: 500,
};

const FRESH_PROFILE: CachedProfile = {
    ...STALE_PROFILE,
    builtAt: Date.now(),
};

function makeContextWithTarget(targetId = "target-id") {
    const context = makeMockContext();
    vi.mocked(context.client.users.cache.get).mockReturnValue(undefined);
    Object.defineProperty(context.client, "user", { value: { id: "bot-id", bot: true }, configurable: true });

    vi.mocked(context.database.query).mockResolvedValue([{ user_id: targetId }]);
    vi.mocked(context.webhook.sendMessage).mockResolvedValue(true);

    return context;
}

describe("mimic command", () => {
    beforeEach(() => vi.clearAllMocks());

    it("replies with error when used outside a guild", async () => {
        const context = makeMockContext();
        const message = makeNoGuildMessage("!mimic");

        await mimicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.reply)).toHaveBeenCalledWith(
            message,
            "This command can only be used in a server.",
        );
    });

    it("serves fresh cache hit without rebuilding", async () => {
        const context = makeContextWithTarget();
        vi.mocked(mimicCache.get).mockReturnValue(FRESH_PROFILE);
        vi.mocked(mimicCache.isExpired).mockReturnValue(false);

        const message = makeMessage("!mimic");
        const mentioned = { id: "target-id", bot: false };
        message.mentions.users.set("target-id", mentioned as never);
        message.mentions.users.first = () => mentioned as never;

        await mimicCommand.function(message, context);

        expect(vi.mocked(context.webhook.sendMessage)).toHaveBeenCalledWith(
            message.channel.id,
            "mocked generated text",
            "target-id",
        );
        expect(vi.mocked(context.messageHandler.markComplete)).toHaveBeenCalledWith(message);
        expect(vi.mocked(mimicCache.enqueue)).not.toHaveBeenCalled();
    });

    it("serves stale cache hit and enqueues a rebuild", async () => {
        const context = makeContextWithTarget();
        vi.mocked(mimicCache.get).mockReturnValue(STALE_PROFILE);
        vi.mocked(mimicCache.isExpired).mockReturnValue(true);

        const message = makeMessage("!mimic");
        const mentioned = { id: "target-id", bot: false };
        message.mentions.users.set("target-id", mentioned as never);
        message.mentions.users.first = () => mentioned as never;

        await mimicCommand.function(message, context);

        expect(vi.mocked(context.webhook.sendMessage)).toHaveBeenCalledWith(
            message.channel.id,
            "mocked generated text",
            "target-id",
        );
        expect(vi.mocked(context.messageHandler.markComplete)).toHaveBeenCalledWith(message);
        expect(vi.mocked(mimicCache.enqueue)).toHaveBeenCalledWith(
            "target-id",
            context.database,
            context.logger,
            context.config.prefix,
        );
    });

    it("builds inline on cache miss and enqueues full rebuild", async () => {
        const context = makeContextWithTarget();
        vi.mocked(mimicCache.get).mockReturnValue(null);
        vi.mocked(context.database.query).mockResolvedValue([
            { message: "hello world how are you" },
            { message: "this is another message today" },
            { message: "third message for the chain" },
        ]);

        const message = makeMessage("!mimic");
        const mentioned = { id: "target-id", bot: false };
        message.mentions.users.set("target-id", mentioned as never);
        message.mentions.users.first = () => mentioned as never;

        await mimicCommand.function(message, context);

        expect(vi.mocked(context.webhook.sendMessage)).toHaveBeenCalledWith(
            message.channel.id,
            "mocked generated text",
            "target-id",
        );
        expect(vi.mocked(context.messageHandler.markComplete)).toHaveBeenCalledWith(message);
        expect(vi.mocked(mimicCache.enqueueWithProfile)).toHaveBeenCalled();
    });

    it("replies with not-enough-messages when cache miss and too few rows", async () => {
        const context = makeContextWithTarget();
        vi.mocked(mimicCache.get).mockReturnValue(null);
        vi.mocked(context.database.query).mockResolvedValue([{ message: "only one message" }]);

        const message = makeMessage("!mimic");
        const mentioned = { id: "target-id", bot: false };
        message.mentions.users.set("target-id", mentioned as never);
        message.mentions.users.first = () => mentioned as never;

        await mimicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.reply)).toHaveBeenCalledWith(
            message,
            "Not enough message history to generate a mimic.",
        );
    });

    it("replies with no-eligible-users when random pick finds no candidates", async () => {
        const context = makeMockContext();
        vi.mocked(context.database.query).mockResolvedValue([]);
        Object.defineProperty(context.client, "user", { value: { id: "bot-id", bot: true }, configurable: true });

        const message = makeMessage("!mimic");

        await mimicCommand.function(message, context);

        expect(vi.mocked(context.messageHandler.reply)).toHaveBeenCalledWith(
            message,
            "No eligible users found to mimic in this server.",
        );
    });
});
