import type { ICommand } from "../../interfaces";
import { MessageIterator } from "../../systems/messageIterator";
import type { IterableMessage } from "../../systems/messageIterator";
export default {
    name: "deleteafter",
    description: "deletes messages after the replied-to message",
    format: "deleteafter (reply to a message)",
    async function(message, context) {
        const referenceId = message.reference?.messageId;
        if (referenceId) {
            const iterator = new MessageIterator(context.logger, {
                limit: 100,
                async onMessage(fetchedMessage: IterableMessage) {
                    if (referenceId < fetchedMessage.id)
                        setTimeout(() => context.messageHandler.delete(fetchedMessage as never), 10);
                },
                logProgress: false,
            });
            await iterator.iterate(message.channel, message.id);
            context.logger.warn(`Deleting up to 100 messages after "${message.content}"`);
            setTimeout(() => context.messageHandler.delete(message), 5000);
        } else {
            message.reply("You need to reply to a message to delete after the replied-to message");
        }
    },
} satisfies ICommand;
