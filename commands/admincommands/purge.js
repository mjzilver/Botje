const bot = require("../../systems/bot")
const logger = require("../../systems/logger")
const MessageIterator = require("../../systems/messageIterator")
const { config } = require("../../systems/settings")

module.exports = async function purge(message) {
    const iterator = new MessageIterator({
        onMessage: async msg => {
            if (msg.author.id === bot.client.user.id
                || msg.content.match(new RegExp(config.prefix, "gi"))
                || msg.content.match(new RegExp(/bot(je)/, "gi"))) {
                logger.warn(`Purging message: ${msg.content}`)
                await msg.delete()
            }
        },
        logProgress: false
    })

    await iterator.iterate(message.channel)
}