const database = require("./database")
const logger = require("./logger")
const { config } = require("./settings")

module.exports = class eventListener {
    constructor(bot) {
        bot.client.on("shardError", error => {
            logger.error(`Shard error: ${error.message}`)
        })

        bot.client.on("error", error => {
            logger.error(`Client error: ${error.message}`)
        })

        bot.client.on("messageCreate", message => {
            if (!(message.author.id in bot.disallowed))
                if (message.channel.type === "DM") {
                    bot.commandHandler.handleDM(message)
                } else {
                    database.storeMessage(message)
                    bot.commandHandler.handleCommand(message)
                    bot.emoteInjector.handleMessage(message)
                }
        })

        bot.client.on("messageUpdate", (_, newMessage) => {
            if (!(newMessage.author.id in bot.disallowed))
                if (newMessage.channel.type !== "DM") {
                    database.updateMessage(newMessage)
                    bot.emoteInjector.handleMessage(newMessage)
                }
        })

        bot.client.on("messageReactionAdd", reaction => {
            if (reaction.message.author.equals(bot.client.user))
                switch (reaction.emoji.name) {
                case config.positive_emoji:
                    break
                case config.negative_emoji:
                    if (reaction.count >= 3 && reaction.count > reaction.message.reactions.resolve(config.positive_emoji)?.count) {
                        reaction.message.delete({ timeout: 5000 })
                        logger.warn(`Post gets deleted due to downvotes - ${reaction.message.content}`)
                    }
                    break
                case config.redo_emoji:
                    bot.commandHandler.redo(reaction.message)
                    break
                default:
                    break
                }
        })

        bot.client.on("emojiCreate", emoji => {
            bot.backupHandler.saveEmoji(emoji)
        })

        bot.client.on("emojiDelete", emoji => {
            bot.backupHandler.saveEmoji(emoji, "_deleted")
        })

        bot.client.on("emojiUpdate", (oldEmoji, newEmoji) => {
            bot.backupHandler.saveEmoji(oldEmoji, "_old")
            bot.backupHandler.saveEmoji(newEmoji)
        })
    }
}