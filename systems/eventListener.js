const config = require("config.json")
const database = require("systems/database.js")
const bot = require("systems/bot.js")
const logger = require("systems/logger.js")

class Eventlistener {
    constructor() {
        bot.client.on("shardError", function(error) {
            logger.error(`Shard error: ${error.message}`)
        })

        bot.client.on("error", function(error) {
            logger.error(`Client error: ${error.message}`)
        })

        bot.client.on("messageCreate", message => {
            if (!(message.author.id in bot.disallowed)) {
                if (message.channel.type === "DM") {
                    bot.command.handleDM(message)
                } else {
                    database.storeMessage(message)
                    bot.command.handleCommand(message)
                }
            }
        })

        bot.client.on("messageReactionAdd", (reaction) => {
            if (reaction.message.author.equals(bot.client.user)) {
                switch (reaction.emoji.name) {
                case config.positive_emoji:
                    // Handle positive emoji reaction
                    break
                case config.negative_emoji:
                    if (reaction.count >= 3 && reaction.count > reaction.message.reactions.resolve(config.positive_emoji)?.count) {
                        reaction.message.delete({ timeout: 5000 })
                        logger.warn(`Post gets deleted due to downvotes - ${reaction.message.content}`)
                    }
                    break
                case config.redo_emoji:
                    bot.command.redo(reaction.message)
                    break
                default:
                    break
                }
            }
        })

        bot.client.on("emojiCreate", emoji => {
            bot.backup.saveEmoji(emoji)
        })

        bot.client.on("emojiDelete", emoji => {
            bot.backup.saveEmoji(emoji, "_deleted")
        })

        bot.client.on("emojiUpdate", (oldEmoji, newEmoji) => {
            bot.backup.saveEmoji(oldEmoji, "_old")
            bot.backup.saveEmoji(newEmoji)
        })
    }
}

module.exports = new Eventlistener()