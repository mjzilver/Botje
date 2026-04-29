import type {
    ActionRowBuilder,
    AttachmentBuilder,
    CommandInteraction,
    EmbedBuilder,
    Guild,
    GuildEmoji,
    GuildMember,
    User,
} from "discord.js";

export type BotGuild = Guild;

export type BotMember = GuildMember;

export type BotUser = User;

export type BotEmoji = GuildEmoji;

export interface BotReaction {
    count: number | null;
    emoji: { name: string | null };
    message: { id: string };
    users: {
        cache: Map<string, BotUser>;
        fetch(): Promise<Map<string, BotUser>>;
    };
}

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
    author: BotUser;
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
        first(): { url?: string } | undefined;
    };
    embeds?: { url?: string }[];
    reactions: {
        cache: Map<string, BotReaction>;
        resolve(emoji: string): BotReaction | null;
    };
    isSlashCommand?: boolean;
    slashInteraction?: CommandInteraction;
    reply(content: MessageContent): Promise<BotMessage>;
    react(emoji: string): Promise<BotReaction>;
    edit(content: MessageContent): Promise<BotMessage>;
    delete(): Promise<BotMessage>;
    createMessageComponentCollector(options: { componentType: number; time: number }): ComponentCollector;
}

export interface GuildBotMessage extends BotMessage {
    guild: BotGuild;
}

export function isGuildMessage(message: BotMessage): message is GuildBotMessage {
    return message.guild !== null;
}

export type MessageContent =
    | string
    | EmbedBuilder
    | {
          content?: string;
          embeds?: EmbedBuilder[];
          files?: (string | AttachmentBuilder)[];
          components?: ActionRowBuilder[];
          ephemeral?: boolean;
      };

export { EmbedBuilder, AttachmentBuilder, ChannelType } from "discord.js";

export type { TextChannel } from "discord.js";

export interface BotWebhook {
    delete(): Promise<unknown>;
}

export interface BotGuildTextChannel {
    id: string;
    name: string;
    lastMessageId?: string | null;
    guild: {
        id: string;
        name: string;
    };
    messages: {
        fetch(options: { limit: number; before: string }): Promise<Map<string, BotMessage>>;
    };
    fetchWebhooks(): Promise<{ forEach(fn: (webhook: BotWebhook) => void): void }>;
}
