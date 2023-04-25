let logger = require("systems/logger.js")

module.exports = async function deletafter(message) {
    let refenceId = message.reference?.messageId
    if (refenceId) {
        if (message.reference.messageId) {
            message.channel.messages.fetch({
                limit: 100,
                before: message.id
            }).then(messages => messages.forEach(
                (fetchedMessage) => {
                    if (refenceId < fetchedMessage.id) {
                        fetchedMessage.delete({ timeout: 10 })
                    }
                }
            ))
        }
        logger.warn(`Deleting up to 100 messages after "${message.content}"`)
        message.delete({ timeout: 5000 })
    } else {
        message.reply("You need to reply to a manage to delete after the replied to message")
    }
}