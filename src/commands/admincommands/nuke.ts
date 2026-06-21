import type { ICommand, IBotContext } from "../../interfaces";
import type { BotMessage, BotGuildTextChannel } from "../../interfaces/discord";
import { MessageIterator } from "../../utils/support/messageIterator";
import { getTextChannels } from "../../adapters/messageAdapter";
import type { IterableMessage, IteratorStats } from "../../utils/support/messageIterator";

async function nukechannel(channel: BotGuildTextChannel, context: IBotContext): Promise<void> {
    context.logger.warn(`NUKING channel: ${channel.name}`);
    const iterator = new MessageIterator(context.logger, {
        async onMessage(msg: IterableMessage) {
            await msg.delete();
        },
        onComplete(stats: IteratorStats) {
            context.logger.warn(`${stats.totalProcessed} messages nuked from ${channel.name} in ${channel.guild.name}`);
        },
    });
    await iterator.iterate(channel);
}

async function nukeguild(message: BotMessage, context: IBotContext): Promise<void> {
    for (const channel of getTextChannels(context.client))
        if (channel.guild.id === message.guild?.id) await nukechannel(channel, context);
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
            context.messageHandler.send(
                message,
                "Nuke armed to confirm launch type 'launch' to launch the nuke, this cannot be cancelled. This nuke will delete every message in every channel of this disscord.",
            );
            await message.channel.awaitMessages?.({ filter, max: 1, time: 60000 });
            context.messageHandler.send(message, "Nuke launched. Blowout soon, fellow stalker.");
            nukeguild(message, context);
        } else {
            context.messageHandler.send(message, "Only the server owner may send the nuke.");
        }
    },
} satisfies ICommand;
