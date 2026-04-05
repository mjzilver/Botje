import { ChannelType, type TextChannel } from "../../interfaces/discord";
import type { IClCommand, IBotContext } from "../../interfaces";

export default {
    name: "cleanwebhooks",
    description: "removes all webhooks from all text channels",
    format: "cleanwebhooks",
    async function(_input: string[], context: IBotContext) {
        for (const [, channel] of context.client.channels.cache.entries()) {
            if (channel.type === ChannelType.GuildText) {
                const webhooks = await (channel as TextChannel).fetchWebhooks();
                webhooks.forEach((webhook) => {
                    context.logger.console(String(webhook));
                    webhook.delete();
                });
            }
        }
    },
} satisfies IClCommand;
