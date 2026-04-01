import * as discord from "discord.js";
import type { IClCommand, IBotContext } from "../../interfaces";
import { MessageIterator } from "../../systems/messageIterator";
import type { IterableMessage, IteratorStats } from "../../systems/messageIterator";
export default {
    name: "save",
    description: "saves a set of messages from a given channel",
    format: "save [channelid] [amount]?",
    async function(input: string[], context: IBotContext) {
        const channels = context.client.channels.cache;
        if (input[0]) {
            const channelId = input[0];
            const amount = input[1]?.length !== 0 ? parseInt(input[1] ?? "1000000") : 1000000;
            const channel = channels.get(channelId);
            if (channel && channel.type === discord.ChannelType.GuildText && channel.messages) {
                const messages = channel.messages;
                const textChannel = { ...channel, messages };
                const iterator = new MessageIterator(context.logger, {
                    limit: amount,
                    async onMessage(message: IterableMessage) {
                        context.database.storeMessage(message as never);
                    },
                    onComplete(stats: IteratorStats) {
                        context.logger.console(
                            `${stats.totalProcessed} messages catalogued from ${textChannel.name ?? "unknown"} in ${textChannel.guild?.name ?? "unknown"}`,
                        );
                    },
                });
                await iterator.iterate(textChannel);
            } else {
                context.logger.console("Channel not found");
            }
        } else {
            context.logger.console("No channel id given");
        }
    },
} satisfies IClCommand;
