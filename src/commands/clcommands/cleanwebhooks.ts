import type { IClCommand, IBotContext } from "../../interfaces";
import { getTextChannels } from "../../adapters/messageAdapter";

export default {
    name: "cleanwebhooks",
    description: "removes all webhooks from all text channels",
    format: "cleanwebhooks",
    async function(_input: string[], context: IBotContext) {
        for (const channel of getTextChannels(context.client)) {
            const webhooks = await channel.fetchWebhooks();
            webhooks.forEach((webhook) => {
                context.logger.console(String(webhook));
                webhook.delete();
            });
        }
    },
} satisfies IClCommand;
