import type {
    ActionRowBuilder,
    AttachmentBuilder,
    CommandInteraction,
    EmbedBuilder,
    Guild,
    GuildEmoji,
    GuildMember,
    MessageReaction,
    User,
} from "discord.js";

export type BotGuild = Guild;

export type BotMember = GuildMember;

export type BotUser = User;

export type BotReaction = MessageReaction;

export type BotEmoji = GuildEmoji;

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
    react(emoji: string): Promise<unknown>;
    edit(content: MessageContent): Promise<BotMessage>;
    delete(): Promise<unknown>;
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
