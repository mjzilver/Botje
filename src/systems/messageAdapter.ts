import * as discord from "discord.js";
import type { BotMessage, BotReaction, BotGuildTextChannel } from "../interfaces/discord";

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
