import * as discord from "discord.js";
import type { IClCommand, IBotContext } from "../../interfaces";
import save from "./save";

export default {
    name: "scan",
    description: "saves all messages in all channels",
    format: "scan [amount]?",
    function(input: string[], context: IBotContext) {
        for (const [channelId, channel] of context.client.channels.cache.entries())
            if (channel.type === discord.ChannelType.GuildText) save.function([channelId, ...input], context);
    },
} satisfies IClCommand;
