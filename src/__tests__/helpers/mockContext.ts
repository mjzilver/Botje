import { mockDeep } from "vitest-mock-extended";
import type { IBotContext } from "../../interfaces";
import type { BotConfig } from "../../interfaces/config";
import type { LoadedCommands } from "../../handlers/commandLoader";

export const TEST_CONFIG: BotConfig = {
    prefix: "!",
    discord_api_key: "test",
    discord_api_key_beta: "test",
    weather_api_key: "test",
    youtube_api_key: "test",
    owner: "owner-id",
    speakEvery: 100,
    speakMinTimeoutMinutes: 20,
    speakMaxTimeoutMinutes: 60,
    speakRandomChance: 20,
    downvoteThreshold: 3,
    timeoutDuration: 5,
    bot_avatar: "avatar.png",
    color_hex: "#ffffff",
    spamchecker: 5,
    image: { size: 256, magnification: 2 },
    positive_emoji: "👍",
    negative_emoji: "👎",
    redo_emoji: "🔄",
    db: { user: "test", host: "localhost", database: "test", password: "test", port: 5432, poolSize: 5 },
    llm: {
        model: "test",
        api: "test",
        base_prompt: "test",
        conversation: "test",
        conversation_prompt: "test",
        tarot_prompt: "test",
        max_concurrent_requests: 1,
    },
    scan_on_startup: false,
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
        image: {
            ...TEST_CONFIG.image,
            ...(overrides.image ?? {}),
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
