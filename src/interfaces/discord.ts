import type { CommandInteraction, EmbedBuilder } from "discord.js";

export interface ComponentCollectorInteraction {
    user: { id: string };
    customId: string;
    replied: boolean;
    reply(content: MessageContent): Promise<void>;
    update(content: MessageContent): Promise<void>;
}

export interface ComponentCollector {
    on(event: "collect", handler: (interaction: ComponentCollectorInteraction) => void): void;
    on(event: "end", handler: () => void): void;
}

export interface BotMessage {
    id: string;
    content: string;
    author: {
        id: string;
        username: string;
        tag: string;
        bot: boolean;
        displayAvatarURL(options?: { size?: number }): string;
    };
    channel: {
        id: string;
        type: number;
        name?: string;
        send(content: MessageContent): Promise<BotMessage>;
        awaitMessages?(options: {
            filter: (m: BotMessage) => boolean;
            max?: number;
            time?: number;
        }): Promise<Map<string, BotMessage>>;
        messages: {
            fetch(options: { limit: number; before?: string }): Promise<Map<string, BotMessage>>;
            fetch(id: string): Promise<BotMessage>;
            fetch(options: { limit: number; before?: string } | string): Promise<Map<string, BotMessage> | BotMessage>;
        };
    };
    guild: BotGuild | null;
    member: BotMember | null;
    mentions: {
        users: Map<string, BotUser> & {
            first(): BotUser | undefined;
        };
    };
    type?: number;
    reference?: {
        messageId?: string;
    } | null;
    createdAt: Date;
    createdTimestamp: number;
    cleanContent: string;
    attachments?: {
        size: number;
        first():
            | {
                  url?: string;
              }
            | undefined;
    };
    embeds?: {
        url?: string;
    }[];
    reactions: {
        cache: Map<string, BotReaction>;
        resolve(emoji: string): BotReaction | null;
    };
    isSlashCommand?: boolean;
    interaction?: CommandInteraction;
    reply(content: MessageContent): Promise<BotMessage>;
    react(emoji: string): Promise<void>;
    edit(content: MessageContent): Promise<BotMessage>;
    delete(): Promise<void>;
    createMessageComponentCollector(options: { componentType: number; time: number }): ComponentCollector;
}

export interface BotGuild {
    id: string;
    name: string;
    ownerId?: string;
    members: {
        fetch(id: string): Promise<BotMember>;
        cache: Map<string, BotMember> & {
            find(fn: (m: BotMember) => boolean): BotMember | undefined;
        };
    };
    channels: {
        cache: Map<string, AnyChannel>;
    };
    emojis: {
        cache: Map<string, BotEmoji>;
    };
}

export interface GuildBotMessage extends BotMessage {
    guild: BotGuild;
}

export function isGuildMessage(message: BotMessage): message is GuildBotMessage {
    return message.guild !== null;
}

export interface BotMember {
    id: string;
    displayName: string;
    joinedAt?: Date;
    permissions: {
        has(flag: bigint): boolean;
    };
    user: BotUser;
}

export interface BotUser {
    id: string;
    username: string;
    tag: string;
    bot: boolean;
    displayAvatarURL(options?: { size?: number }): string;
    equals(other: BotUser): boolean;
}

export interface BotReaction {
    emoji: {
        name: string | null;
    };
    count: number | null;
    users: {
        cache: Map<string, BotUser>;
        fetch(): Promise<Map<string, BotUser>>;
    };
    message: { id: string; content: string | null };
}

export interface BotEmoji {
    id: string;
    name: string | null;
    imageURL(options?: { size?: number }): string;
    guild: BotGuild;
}

export interface AnyChannel {
    id: string;
    name?: string;
    type: number;
    guild?: {
        id?: string;
        name?: string;
    };
    send?(content: MessageContent): Promise<BotMessage>;
    fetchWebhooks?(): Promise<
        Map<
            string,
            {
                delete(): Promise<void>;
            }
        >
    >;
    messages?: {
        fetch(
            options:
                | {
                      limit: number;
                      before?: string;
                  }
                | string,
        ): Promise<Map<string, BotMessage> | BotMessage>;
    };
}

export type MessageContent =
    | string
    | EmbedBuilder
    | {
          content?: string;
          embeds?: EmbedBuilder[];
          files?: (string | import("discord.js").AttachmentBuilder)[];
          components?: object[];
          ephemeral?: boolean;
      };
