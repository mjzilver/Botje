const logger = require("../../systems/logger")

module.exports = async function deleteafter(message) {
    const referenceId = message.reference?.messageId
    if (referenceId) {
        if (message.reference.messageId)
            message.channel.messages.fetch({
                limit: 100,
                before: message.id
            }).then(messages => messages.forEach(
                fetchedMessage => {
                    if (referenceId < fetchedMessage.id)
                        setTimeout(() => fetchedMessage.delete().catch(() => {}), 10)
                }
            ))

        logger.warn(`Deleting up to 100 messages after "${message.content}"`)
        setTimeout(() => message.delete().catch(() => {}), 5000)
    } else {
        message.reply("You need to reply to a message to delete after the replied-to message")
    }
}