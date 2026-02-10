const logger = require("../../systems/logger")

module.exports = async function deletafter(message) {
    const refenceId = message.reference?.messageId
    if (refenceId) {
        if (message.reference.messageId)
            message.channel.messages.fetch({
                limit: 100,
                before: message.id
            }).then(messages => messages.forEach(
                fetchedMessage => {
                    if (refenceId < fetchedMessage.id)
                        setTimeout(() => fetchedMessage.delete().catch(() => {}), 10)
                }
            ))

        logger.warn(`Deleting up to 100 messages after "${message.content}"`)
        setTimeout(() => message.delete().catch(() => {}), 5000)
    } else {
        message.reply("You need to reply to a manage to delete after the replied to message")
    }
}