import * as discord from "discord.js";
import { ApplicationCommandOptionType, Collection } from "discord.js";
import type { BotMessage, BotReaction, BotGuildTextChannel, BotUser, ComponentCollector, MessageContent } from "../interfaces/discord";

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

export function interactionToMessage(
    interaction: discord.ChatInputCommandInteraction,
    commandName: string,
): BotMessage {
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

    const fullContent = args.length > 0 ? `${commandName} ${args.join(" ")}` : commandName;
    const pseudoMessage: BotMessage = {
        id: interaction.id,
        content: fullContent,
        cleanContent: fullContent,
        author: interaction.user as BotUser,
        channel: toBotChannel(interaction.channel),
        guild: interaction.guild as BotMessage["guild"],
        member: null,
        mentions: {
            users: new Collection<string, BotUser>(mentionMap) as Map<string, BotUser> & {
                first(): BotUser | undefined;
            },
        },
        createdTimestamp: interaction.createdTimestamp,
        createdAt: new Date(interaction.createdTimestamp),
        reactions: { cache: new Map<string, BotReaction>(), resolve: () => null },
        reference: null,
        isSlashCommand: true,
        slashInteraction: interaction,
        reply: (_content: MessageContent) => Promise.resolve(pseudoMessage),
        react: (_emoji: string) =>
            Promise.resolve({
                count: 0,
                emoji: { name: null },
                message: { id: pseudoMessage.id },
                users: {
                    cache: new Map<string, BotUser>(),
                    fetch: () => Promise.resolve(new Map<string, BotUser>()),
                },
            }),
        edit: (_content: MessageContent) => Promise.resolve(pseudoMessage),
        delete: () => Promise.resolve(pseudoMessage),
        createMessageComponentCollector: (_options: {
            componentType: number;
            time: number;
        }): ComponentCollector => ({ on: () => {} }),
    };

    return pseudoMessage;
}
