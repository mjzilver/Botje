import { mockDeep } from "vitest-mock-extended";
import type { IBotContext } from "../../interfaces";
import type { BotConfig } from "../../interfaces/config";

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
    port: 3000,
    "dev-port": 3001,
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

export function makeMockContext(overrides?: Partial<IBotContext>): IBotContext {
    const ctx = mockDeep<IBotContext>();

    ctx.config = TEST_CONFIG;
    ctx.loadedCommands = {
        commands: {},
        admincommands: {},
        dmcommands: {},
        clcommands: {},
        disabled: new Set<string>() as unknown as Set<string> & typeof ctx.loadedCommands.disabled,
    };
    ctx.disallowed = {};

    if (overrides) Object.assign(ctx, overrides);

    return ctx;
}
