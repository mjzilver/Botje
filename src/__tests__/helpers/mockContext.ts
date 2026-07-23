import { mockDeep } from "vitest-mock-extended";
import type { LoadedCommands } from "../../handlers/commandLoader";
import type { IBotContext } from "../../interfaces";
import type { BotConfig } from "../../interfaces/config";

export const TEST_CONFIG: BotConfig = {
    prefix: "!",
    botName: "test-bot",
    discordApiKey: "test",
    discordApiKeyBeta: "test",
    weatherApiKey: "test",
    youtubeApiKey: "test",
    owner: "owner-id",
    speakEvery: 100,
    speakMinTimeoutMinutes: 20,
    speakMaxTimeoutMinutes: 60,
    speakRandomChance: 20,
    downvoteThreshold: 3,
    timeoutDuration: 5,
    colorHex: "#ffffff",
    positiveEmoji: "👍",
    negativeEmoji: "👎",
    redoEmoji: "🔄",
    db: { user: "test", host: "localhost", database: "test", password: "test", port: 5432, poolSize: 5 },
    llm: {
        model: "test",
        api: "test",
        basePrompt: "test",
        conversationPrompt: "test",
        tarotPrompt: "test",
        maxConcurrentRequests: 1,
    },
    shouldScanOnStartup: false,
};

export function makeTestConfig(overrides: Partial<BotConfig> = {}): BotConfig {
    return {
        ...TEST_CONFIG,
        ...overrides,
        db: {
            ...TEST_CONFIG.db,
            ...(overrides.db ?? {}),
        },
        llm: {
            ...TEST_CONFIG.llm,
            ...(overrides.llm ?? {}),
        },
    };
}

export function makeLoadedCommands(overrides?: Partial<LoadedCommands>): LoadedCommands {
    const loadedCommands: LoadedCommands = {
        commands: {},
        admincommands: {},
        dmcommands: {},
        clcommands: {},
        disabled: new Set<string>(),
    };

    if (overrides) {
        Object.assign(loadedCommands, overrides);
    }

    return loadedCommands;
}

export function makeMockContext(overrides?: Partial<IBotContext> & { config?: Partial<BotConfig> }): IBotContext {
    const ctx = mockDeep<IBotContext>();

    ctx.config = makeTestConfig(overrides?.config);
    ctx.loadedCommands = mockDeep<LoadedCommands>();
    Object.assign(ctx.loadedCommands, makeLoadedCommands());
    ctx.disallowed = {};

    if (overrides) {
        Object.assign(ctx, overrides);
        if (overrides.config) {
            ctx.config = makeTestConfig(overrides.config);
        }
        if (overrides.loadedCommands) {
            const loadedCommands = mockDeep<LoadedCommands>();
            Object.assign(loadedCommands, makeLoadedCommands(overrides.loadedCommands));
            ctx.loadedCommands = loadedCommands;
        }
    }

    return ctx;
}
