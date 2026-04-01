import type { ICommand } from "../../interfaces";
import { MessageIterator } from "../../systems/messageIterator";
import type { IterableMessage } from "../../systems/messageIterator";

export default {
    name: "purge",
    description: "removes bot messages and messages with the bot prefix from the channel",
    format: "purge",
    async function(message, context) {
        const iterator = new MessageIterator(context.logger, {
            async onMessage(msg: IterableMessage) {
                if (
                    msg.author?.id === context.client.user?.id ||
                    msg.content?.match(new RegExp(context.config.prefix, "gi")) ||
                    msg.content?.match(/bot(je)?/gi)
                ) {
                    context.logger.warn(`Purging message: ${msg.content}`);
                    await msg.delete();
                }
            },
            logProgress: false,
        });
        await iterator.iterate(message.channel);
    },
} satisfies ICommand;
