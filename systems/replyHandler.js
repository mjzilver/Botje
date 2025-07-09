const logger = require("./logger")

module.exports = class ReplyHandler {
    constructor(bot) {
        this.replyPatterns = require("../json/reply.json")

        this.bot = bot

        // replyPattern name as key -> time as value
        this.lastRequest = []
    }

    process(message) {
        let match = false
        for (const reply of this.replyPatterns)
            if (message.content.match(new RegExp(reply["regex"], "gi")) && this.checkTime(reply)) {
                logger.debug(`Replying to message '${message.content}' that matched ReplyPattern '${reply["name"]}'`)
                if (reply["reply"])
                    this.bot.messageHandler.reply(message, reply["replies"].pickRandom() + (reply["mention"] ? `, ${message.author.username}` : ""))
                else
                    this.bot.messageHandler.send(message, reply["replies"].pickRandom() + (reply["mention"] ? `, ${message.author.username}` : ""))

                match = true
            }

        return match
    }

    checkTime(reply) {
        const currentTimestamp = new Date()

        if (!(reply["name"] in this.lastRequest)) {
            this.lastRequest[reply["name"]] = currentTimestamp
        } else {
            if ((currentTimestamp - this.lastRequest[reply["name"]] < (reply["timeout"] * 60 * 1000)))
                return false

            this.lastRequest[reply["name"]] = currentTimestamp
        }
        return true
    }
}