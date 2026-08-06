import { getTextChannels } from "../../adapters/messageAdapter";
import type { IBotContext } from "../../interfaces";

export function completeTextChannelNames(context: IBotContext): string[] {
    return getTextChannels(context.client).map((channel) => channel.name);
}