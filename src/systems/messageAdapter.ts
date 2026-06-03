import * as discord from "discord.js";
import { ApplicationCommandOptionType } from "discord.js";
import type {
    BotMessage,
    BotReaction,
    BotGuildTextChannel,
    BotUser,
    ComponentCollector,
    MessageContent,
} from "../interfaces/discord";

export function toBotMessage(message: discord.Message): BotMessage {
    return message as BotMessage;
}

export function toBotReaction(reaction: discord.MessageReaction | discord.PartialMessageReaction): BotReaction {
    return reaction as BotReaction;
}

export function toBotChannel(channel: discord.TextBasedChannel | null): BotMessage["channel"] {
    return channel as BotMessage["channel"];
}

export function getTextChannels(client: discord.Client): BotGuildTextChannel[] {
    const result: BotGuildTextChannel[] = [];
    for (const ch of client.channels.cache.values())
        if (ch.type === discord.ChannelType.GuildText) result.push(ch as unknown as BotGuildTextChannel);

    return result;
}

function extractInteractionArgs(interaction: discord.ChatInputCommandInteraction): {
    content: string;
    mentionMap: Map<string, BotUser>;
} {
    const args: string[] = [];
    const subcommand = interaction.options.getSubcommand(false);
    if (subcommand) args.push(subcommand);

    const optionData = subcommand ? (interaction.options.data[0]?.options ?? []) : interaction.options.data;
    const mentionMap = new Map<string, BotUser>();

    for (const option of optionData) {
        if (option.type === ApplicationCommandOptionType.User && option.user) {
            args.push(`<@${option.user.id}>`);
            mentionMap.set(option.user.id, option.user as BotUser);
        } else if (
            option.type === ApplicationCommandOptionType.String ||
            option.type === ApplicationCommandOptionType.Integer
        ) {
            args.push(String(option.value));
        }
    }

    const content = args.length > 0 ? args.join(" ") : "";

    return { content, mentionMap };
}

export function cliToMessage(channel: BotGuildTextChannel, client: discord.Client, content: string): BotMessage | null {
    if (!client.user) return null;
    const botChannel = toBotChannel(channel as unknown as discord.TextChannel);
    const botUser = client.user as BotUser;
    const pseudoMessage: BotMessage = {
        id: Date.now().toString(),
        content,
        cleanContent: content,
        author: botUser,
        channel: botChannel,
        guild: (channel as unknown as discord.TextChannel).guild as BotMessage["guild"],
        member: null,
        mentions: { users: Object.assign(new Map<string, BotUser>(), { first: (): BotUser | undefined => undefined }) },
        createdAt: new Date(),
        createdTimestamp: Date.now(),
        reactions: { cache: new Map<string, BotReaction>(), resolve: () => null },
        reference: null,
        reply: (c: MessageContent) => botChannel.send(c),
        react: (_emoji: string) => Promise.resolve({} as unknown as BotReaction),
        edit: (_c: MessageContent) => Promise.resolve(pseudoMessage),
        delete: () => Promise.resolve(pseudoMessage),
        createMessageComponentCollector: (_options: { componentType: number; time: number }): ComponentCollector => ({
            on: () => {},
        }),
    };

    return pseudoMessage;
}

export function interactionToMessage(
    interaction: discord.ChatInputCommandInteraction,
    commandName: string,
): BotMessage {
    const { content: argContent, mentionMap } = extractInteractionArgs(interaction);
    const fullContent = argContent ? `${commandName} ${argContent}` : commandName;
    const mentions = Object.assign(new Map<string, BotUser>(mentionMap), {
        first: (): BotUser | undefined => mentionMap.values().next().value,
    });

    const pseudoMessage: BotMessage = {
        id: interaction.id,
        content: fullContent,
        cleanContent: fullContent,
        author: interaction.user as BotUser,
        channel: toBotChannel(interaction.channel),
        guild: interaction.guild as BotMessage["guild"],
        member: null,
        mentions: { users: mentions },
        createdTimestamp: interaction.createdTimestamp,
        createdAt: new Date(interaction.createdTimestamp),
        reactions: { cache: new Map<string, BotReaction>(), resolve: () => null },
        reference: null,
        isSlashCommand: true,
        slashInteraction: interaction,
        reply: (_content: MessageContent) => Promise.resolve(pseudoMessage),
        react: (_emoji: string) => Promise.resolve({} as unknown as BotReaction),
        edit: (_content: MessageContent) => Promise.resolve(pseudoMessage),
        delete: () => Promise.resolve(pseudoMessage),
        createMessageComponentCollector: (_options: { componentType: number; time: number }): ComponentCollector => ({
            on: () => {},
        }),
    };

    return pseudoMessage;
}
