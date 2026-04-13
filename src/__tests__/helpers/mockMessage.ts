import type { BotMessage, BotGuild, BotMember } from "../../interfaces/discord";

interface MessageOptions {
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
        id: "msg-id",
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
            send: async () => makeMessage("bot reply"),
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
        reply: async () => makeMessage("reply"),
        react: async () => undefined,
        edit: async () => makeMessage(content),
        delete: async () => undefined,
        createMessageComponentCollector: () => ({ on: () => undefined }),
    } as unknown as BotMessage;
}
