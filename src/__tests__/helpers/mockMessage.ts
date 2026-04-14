import { vi } from "vitest";
import type { BotMessage, BotGuild, BotMember } from "../../interfaces/discord";

interface MessageOptions {
    id?: string;
    authorId?: string;
    guildId?: string;
    guildOwnerId?: string;
    isAdmin?: boolean;
    isBot?: boolean;
    channelId?: string;
    channelType?: number;
    createdTimestamp?: number;
}

export function makeMessage(content: string, opts: MessageOptions = {}): BotMessage {
    const {
        id = "msg-id",
        authorId = "user-id",
        guildId = "guild-id",
        guildOwnerId = "owner-id",
        isAdmin = false,
        isBot = false,
        channelId = "channel-id",
        channelType = 0,
        createdTimestamp = Date.now(),
    } = opts;

    const guild = {
        id: guildId,
        ownerId: guildOwnerId,
        name: "Test Guild",
    } as unknown as BotGuild;

    const member = {
        id: authorId,
        permissions: {
            has: () => isAdmin,
        },
    } as unknown as BotMember;

    return {
        id,
        content,
        author: { id: authorId, username: "TestUser", bot: isBot },
        channel: {
            id: channelId,
            type: channelType,
            name: "test-channel",
            messages: {
                fetch: async (idOrOpts: string | { limit: number; before?: string }) => {
                    if (typeof idOrOpts === "string") return makeMessage("!ping");

                    return new Map();
                },
            },
            send: vi.fn().mockResolvedValue(undefined),
        },
        guild,
        member,
        mentions: { users: Object.assign(new Map(), { first: () => undefined }) },
        createdAt: new Date(),
        createdTimestamp,
        cleanContent: content,
        reactions: {
            cache: new Map(),
            resolve: () => null,
        },
        reply: vi.fn().mockResolvedValue(undefined),
        react: vi.fn().mockResolvedValue(undefined),
        edit: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        createMessageComponentCollector: () => ({ on: () => undefined }),
    } as unknown as BotMessage;
}

export function makeNoGuildMessage(content: string): BotMessage {
    return { ...makeMessage(content), guild: null } as unknown as BotMessage;
}
