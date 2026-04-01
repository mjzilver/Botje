import * as discord from "discord.js";
import type { IClCommand, IBotContext } from "../../interfaces";
export default {
    name: "cleanwebhooks",
    description: "removes all webhooks from all text channels",
    format: "cleanwebhooks",
    async function(_input: string[], context: IBotContext) {
        for (const [, channel] of context.client.channels.cache.entries()) {
            if (channel.type === discord.ChannelType.GuildText) {
                (channel as discord.TextChannel).fetchWebhooks().then((webhooks) => {
                    webhooks.forEach((webhook) => {
                        context.logger.console(String(webhook));
                        webhook.delete();
                    });
                });
            }
        }
    },
} satisfies IClCommand;
