const logger = require("../../systems/logger")
const MessageIterator = require("../../systems/messageIterator")

module.exports = async function deleteafter(message) {
    const referenceId = message.reference?.messageId
    if (referenceId) {
        if (message.reference.messageId) {
            const iterator = new MessageIterator({
                limit: 100,
                onMessage: async (fetchedMessage) => {
                    if (referenceId < fetchedMessage.id) {
                        setTimeout(() => fetchedMessage.delete().catch(() => {}), 10)
                    }
                },
                logProgress: false
            })

            await iterator.iterate(message.channel, message.id)
        }

        logger.warn(`Deleting up to 100 messages after "${message.content}"`)
        setTimeout(() => message.delete().catch(() => {}), 5000)
    } else {
        message.reply("You need to reply to a message to delete after the replied-to message")
    }
}