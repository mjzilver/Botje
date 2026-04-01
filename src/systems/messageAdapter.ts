import type * as discord from "discord.js";
import type { BotMessage, BotReaction } from "../interfaces/discord";

export function toBotMessage(message: discord.Message): BotMessage {
    return message as unknown as BotMessage;
}

export function toPartialBotMessage(message: discord.Message | discord.PartialMessage): BotMessage {
    return message as unknown as BotMessage;
}

export function toBotReaction(reaction: discord.MessageReaction | discord.PartialMessageReaction): BotReaction {
    return reaction as unknown as BotReaction;
}

export function toBotChannel(channel: discord.TextBasedChannel | null): BotMessage["channel"] {
    return channel as unknown as BotMessage["channel"];
}
