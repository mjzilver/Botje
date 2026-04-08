import { vi } from "vitest";
import type { Client } from "discord.js";
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

export function makeMockContext(overrides?: Partial<IBotContext>): IBotContext {
    const defaults = {
        database: {
            query: vi.fn().mockResolvedValue([]),
            insert: vi.fn().mockResolvedValue(undefined),
            getCount: vi.fn().mockResolvedValue(0),
            queryRandomMessage: vi.fn().mockResolvedValue(undefined),
            ensureUserExists: vi.fn().mockResolvedValue(undefined),
            storeMessage: vi.fn().mockResolvedValue(undefined),
            updateMessage: vi.fn().mockResolvedValue(undefined),
            insertMessage: vi.fn().mockResolvedValue(undefined),
            insertReaction: vi.fn().mockResolvedValue(undefined),
            getCurrentUsername: vi.fn().mockResolvedValue(null),
        },
        messageHandler: {
            send: vi.fn().mockResolvedValue(undefined),
            reply: vi.fn().mockResolvedValue(undefined),
            edit: vi.fn().mockResolvedValue(undefined),
            delete: vi.fn().mockResolvedValue(undefined),
            react: vi.fn().mockResolvedValue(undefined),
            addCommandCall: vi.fn(),
            markComplete: vi.fn(),
            findFromReply: vi.fn().mockReturnValue(undefined),
        },
        logger: {
            error: vi.fn(),
            warn: vi.fn(),
            info: vi.fn(),
            debug: vi.fn(),
            startup: vi.fn(),
            console: vi.fn(),
            repeat: vi.fn(),
            printColumns: vi.fn(),
            printRows: vi.fn(),
        },
        config: TEST_CONFIG,
        userHandler: {
            getDisplayName: vi.fn().mockResolvedValue("TestUser"),
        },
        pagination: {
            createPages: vi.fn().mockResolvedValue([]),
            sendPaginatedEmbed: vi.fn().mockResolvedValue(undefined),
        },
        backupHandler: {
            backupAllEmotes: vi.fn().mockResolvedValue(undefined),
            backupConfig: vi.fn().mockResolvedValue(undefined),
            backupDatabase: vi.fn().mockResolvedValue(undefined),
        },
        hangman: {
            run: vi.fn(),
        },
        llm: {
            streamToMessage: vi.fn().mockResolvedValue(undefined),
        },
        loadedCommands: {
            commands: {},
            admincommands: {},
            dmcommands: {},
            clcommands: {},
        },
        dictionary: {
            getNonSelectorsRegex: vi.fn().mockReturnValue(/(?!)/),
        },
        client: {} as unknown as Client,
        disallowed: {},
    };

    return { ...defaults, ...overrides } as unknown as IBotContext;
}
