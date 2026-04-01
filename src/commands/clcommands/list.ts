import * as discord from "discord.js";
import type { IClCommand, IBotContext } from "../../interfaces";
export default {
    name: "list",
    description: "lists all channels in all guilds",
    format: "list",
    function(_input: string[], context: IBotContext) {
        const channels: {
            channelId: string;
            channel: discord.TextChannel;
        }[] = [];
        for (const [channelId, channel] of context.client.channels.cache.entries())
            if (channel.type === discord.ChannelType.GuildText)
                channels.push({ channelId, channel: channel as discord.TextChannel });
        channels.sort((a, b) => {
            const nameA = a.channel.guild.name.toLowerCase();
            const nameB = b.channel.guild.name.toLowerCase();
            if (nameA < nameB) return -1;
            if (nameA > nameB) return 1;
            return 0;
        });
        context.logger.printColumns(
            [
                channels.map(({ channelId }) => channelId),
                channels.map(({ channel }) => channel.name),
                channels.map(({ channel }) => channel.guild.name),
            ],
            ["Channel ID", "Channel Name", "Guild Name"],
        );
    },
} satisfies IClCommand;
