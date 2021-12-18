class Reply {
    constructor() {
        this.replyPatterns = require('../json/reply.json')

        // replyPattern name as key -> time as value
        this.lastRequest = []
    }

    process(message) {
        var match = false
        for (const reply of this.replyPatterns) {
            if (message.content.match(new RegExp(reply["regex"], "gi")) && this.checkTime(reply)) {
                logger.debug( `Replying to message '${message.content}' that matched ReplyPattern '${reply["name"]}'`)
                if(reply["reply"])
                    message.reply(reply["replies"].pickRandom() + (reply["mention"] ? `, ${message.author.username}` : ''))
                else 
                    message.channel.send(reply["replies"].pickRandom() + (reply["mention"] ? `, ${message.author.username}` : ''))

                match = true
            }
        }
        return match
    }

    checkTime(reply) {
        var currentTimestamp = new Date()

        if (!(reply["name"] in this.lastRequest)) {
            this.lastRequest[reply["name"]] = currentTimestamp
        } else {
            if ((currentTimestamp - this.lastRequest[reply["name"]] < (reply["timeout"] * 60 * 1000))) {
                return false
            } else {
                this.lastRequest[reply["name"]] = currentTimestamp
            }
        }
        return true
    }
}

module.exports = new Reply()