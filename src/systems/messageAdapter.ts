import type * as discord from "discord.js";
import type { BotMessage, BotReaction } from "../interfaces/discord";

export function toBotMessage(message: discord.Message): BotMessage {
    return message as BotMessage;
}

export function toBotReaction(reaction: discord.MessageReaction | discord.PartialMessageReaction): BotReaction {
    return reaction as BotReaction;
}

export function toBotChannel(channel: discord.TextBasedChannel | null): BotMessage["channel"] {
    return channel as BotMessage["channel"];
}
