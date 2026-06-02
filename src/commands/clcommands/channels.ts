import type { IClCommand, IBotContext } from "../../interfaces";
import type { BotGuildTextChannel } from "../../interfaces/discord";
import { getTextChannels } from "../../systems/messageAdapter";

export default {
    name: "channels",
    description: "lists all channels in all guilds",
    format: "channels",
    function(_input: string[], context: IBotContext) {
        const channels: {
            channelId: string;
            channel: BotGuildTextChannel;
        }[] = [];
        for (const channel of getTextChannels(context.client)) channels.push({ channelId: channel.id, channel });
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
