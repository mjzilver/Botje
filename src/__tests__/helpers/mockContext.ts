import { vi } from "vitest";
import { mockDeep } from "vitest-mock-extended";
import type { Client } from "discord.js";
import type { IBotContext, ICommand } from "../../interfaces";
import type { BotConfig } from "../../interfaces/config";

export const TEST_CONFIG: BotConfig = {
    prefix: "!",
    discord_api_key: "test",
    discord_api_key_beta: "test",
    weather_api_key: "test",
    youtube_api_key: "test",
    owner: "owner-id",
    speakEvery: 100,
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
    db: { user: "test", host: "localhost", database: "test", password: "test", port: 5432 },
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

export function makeCommand(name = "test", overrides?: Partial<ICommand>): ICommand {
    return { name, description: `${name} description`, format: name, function: vi.fn(), ...overrides };
}

export function makeMockContext(overrides?: Partial<IBotContext>): IBotContext {
    const ctx = mockDeep<IBotContext>();

    ctx.config = TEST_CONFIG;
    ctx.loadedCommands = { commands: {}, admincommands: {}, dmcommands: {}, clcommands: {} };
    ctx.disallowed = {};
    ctx.client = mockDeep<Client>();

    ctx.database.query.mockResolvedValue([]);
    ctx.database.getCount.mockResolvedValue(0);
    ctx.database.getCurrentUsername.mockResolvedValue(null);
    ctx.userHandler.getDisplayName.mockResolvedValue("TestUser");
    ctx.pagination.createPages.mockResolvedValue([]);
    ctx.dictionary.getNonSelectorsRegex.mockReturnValue(/(?!)/);

    if (overrides) Object.assign(ctx, overrides);

    return ctx;
}
