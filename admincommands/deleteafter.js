module.exports = async function deletafter(message) {
    var refenceId = message.reference.messageId
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
}