import * as discord from "discord.js";
import type { ICommand, IBotContext } from "../../interfaces";
import type { BotMessage } from "../../interfaces/discord";
import { MessageIterator } from "../../systems/messageIterator";
import type { IterableMessage, IteratorStats } from "../../systems/messageIterator";

async function nukechannel(channel: discord.TextChannel, context: IBotContext): Promise<void> {
    if (channel && channel.type === discord.ChannelType.GuildText) {
        context.logger.warn(`NUKING channel: ${channel.name}`);
        const iterator = new MessageIterator(context.logger, {
            async onMessage(msg: IterableMessage) {
                await msg.delete();
            },
            onComplete(stats: IteratorStats) {
                context.logger.warn(
                    `${stats.totalProcessed} messages nuked from ${channel.name} in ${channel.guild.name}`,
                );
            },
        });
        await iterator.iterate(channel);
    }
}

async function nukeguild(message: BotMessage, context: IBotContext): Promise<void> {
    for (const [, channel] of context.client.channels.cache.entries())
        if (
            channel.type === discord.ChannelType.GuildText &&
            (channel as discord.TextChannel).guild?.id === message.guild?.id
        )
            await nukechannel(channel as discord.TextChannel, context);
}

export default {
    name: "nuke",
    description: "deletes every message in the server (owner only)",
    format: "nuke",
    async function(message, context) {
        if (message.author?.id === message.guild?.ownerId) {
            const filter = (launchMessage: {
                content: string;
                author?: {
                    id: string;
                };
            }) => launchMessage.content.startsWith("launch") && launchMessage.author?.id === message.author?.id;
            message.channel.awaitMessages?.({ filter, max: 1, time: 60000 })?.then(() => {
                context.messageHandler.send(message, "Nuke launched. Blowout soon, fellow stalker.");
                nukeguild(message, context);
            });
            context.messageHandler.send(
                message,
                "Nuke armed to confirm launch type 'launch' to launch the nuke, this cannot be cancelled. This nuke will delete every message in every channel of this disscord.",
            );
        } else {
            context.messageHandler.send(message, "Only the server owner may send the nuke.");
        }
    },
} satisfies ICommand;
