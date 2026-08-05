import type { PermissionsBitField } from "discord.js";
import { vi } from "vitest";
import type { ICommand } from "../../interfaces";
import type { BotGuild, BotMember, BotMessage, BotUser } from "../../interfaces/discord";

export function makeCommand(name = "test", overrides?: Partial<ICommand>): ICommand {
    return { name, description: `${name} description`, format: name, function: vi.fn(), ...overrides };
}

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

export function makeBotUser(overrides: Record<string, unknown> = {}): BotUser {
    return {
        id: "user-id",
        username: "TestUser",
        bot: false,
        ...overrides,
    } as BotUser;
}

export function makeBotGuild(overrides: Record<string, unknown> = {}): BotGuild {
    return {
        id: "guild-id",
        ownerId: "owner-id",
        name: "Test Guild",
        ...overrides,
    } as BotGuild;
}

export function makeBotMember(overrides: Record<string, unknown> = {}): BotMember {
    return {
        id: "user-id",
        permissions: {
            has: () => false,
        } as unknown as Readonly<PermissionsBitField>,
        ...overrides,
    } as BotMember;
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

    const guild = makeBotGuild({ id: guildId, ownerId: guildOwnerId });

    const member = makeBotMember({
        id: authorId,
        permissions: {
            has: () => isAdmin,
        },
    });

    return {
        id,
        content,
        author: makeBotUser({ id: authorId, bot: isBot }),
        channel: {
            id: channelId,
            type: channelType,
            name: "test-channel",
            send: vi.fn().mockResolvedValue(undefined),
            messages: { fetch: vi.fn() },
        },
        guild,
        member,
        mentions: { users: Object.assign(new Map(), { first: () => null }) },
        createdAt: new Date(),
        createdTimestamp,
        cleanContent: content,
        reactions: { cache: new Map(), resolve: () => null },
        reply: vi.fn().mockResolvedValue(undefined),
        react: vi.fn().mockResolvedValue(undefined),
        edit: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
        createMessageComponentCollector: vi.fn().mockReturnValue({ on: vi.fn() }),
    } as BotMessage;
}

export function makeMentionedMessage(content: string, mentionId: string, username: string): BotMessage {
    const mention = makeBotUser({ id: mentionId, username });
    const message = makeMessage(content);

    message.mentions = {
        ...message.mentions,
        users: Object.assign(new Map([[mentionId, mention]]), { first: () => mention }),
    };

    return message;
}

export function makeNoGuildMessage(content: string): BotMessage {
    return { ...makeMessage(content), guild: null } as BotMessage;
}
