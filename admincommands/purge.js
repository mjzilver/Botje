let config = require("config.json")
let bot = require("systems/bot.js")
let logger = require("systems/logger.js")

module.exports = async function purge(message) {
    message.channel.messages.fetch()
        .then(messages => messages.forEach(
            (message) => {
                if (message.author.id == bot.client.user.id || message.content.match(new RegExp(config.prefix, "gi")) || message.content.match(new RegExp(/bot(je)/, "gi"))) {
                    logger.deletion("Purging message: " + message.content)
                    message.delete()
                }
            }
        ))
}