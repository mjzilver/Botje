let config = require("config.json")
let database = require("systems/database.js")
let bot = require("systems/bot.js")
let logger = require("systems/logger.js")

class Message {
    constructor() {
        this.commandCalls = {}
        this.getCommandCalls()
    }

    send(call, content) {
        if (content) {
            let promise = call.channel.send(content)
            promise.then((reply) => {
                this.addCommandCall(call, reply)
                reply.react(config.positive_emoji)
                reply.react(config.negative_emoji)
            })
            return promise
        } else {
            logger.error(`Content empty could not send, call: "${call}"`)
            this.markComplete(call)
        }
    }

    reply(call, content) {
        if (content) {
            let promise = call.reply(content)
            promise.then((reply) => {
                this.addCommandCall(call, reply)
                reply.react(config.positive_emoji)
                reply.react(config.negative_emoji)
            })
            return promise
        } else {
            logger.error(`Content empty could not send, call: "${call}"`)
            this.markComplete(call)
        }
    }

    findFromReply(replyMessage) {
        for (const [call, reply] of Object.entries(this.commandCalls)) {
            if (reply == replyMessage.id) {
                return call
            }
        }
    }

    delete(reply) {
        logger.console(this.commandCalls[reply.id])
        reply.channel.messages.fetch(this.commandCalls[reply.id]).then(() => { })
        reply.delete({ timeout: 5000 })
    }

    markComplete(call) {
        let insertSQL = `INSERT INTO command_calls (call_id, reply_id, timestamp) VALUES ($1::bigint, $2::bigint, $3::bigint) 
        ON CONFLICT (call_id) DO UPDATE SET reply_id = EXCLUDED.reply_id;`
        database.insert(insertSQL, [call.id, null, call.createdAt.getTime()])
        bot.command.commandList.remove(call)
    }

    addCommandCall(call, reply) {
        this.commandCalls[call.id] = reply.id

        let insertSQL = `INSERT INTO command_calls (call_id, reply_id, timestamp) VALUES ($1::bigint, $2::bigint, $3::bigint) 
        ON CONFLICT (call_id) DO UPDATE SET reply_id = EXCLUDED.reply_id;`
        database.insert(insertSQL, [call.id, reply.id, reply.createdAt.getTime()])
        bot.command.commandList.remove(call)
    }

    getCommandCalls() {
        let selectSQL = `SELECT call_id, reply_id, timestamp FROM command_calls 
        WHERE timestamp > ${new Date() - 24 * 60 * 60 * 1000}
        ORDER BY timestamp DESC`

        database.query(selectSQL, [], (rows) => {
            for (let i = 0; i < rows.length; i++) {
                this.commandCalls[rows[i]["call_id"]] = rows[i]["reply_id"]
            }
            this.scanForCommands()
        })
    }

    scanForCommands() {
        logger.startup("Reading messages since startup")
        const yesterday = Date.now() - 24 * 60 * 60 * 1000

        bot.client.channels.cache
            .filter(channel => channel.type === "GUILD_TEXT" && channel.viewable)
            .forEach(channel => {
                channel.messages.fetch({ limit: 100 }).then(messages => {
                    messages
                        .filter(message => message.createdTimestamp > yesterday)
                        .forEach(message => {
                            database.storeMessage(message)
                            if (message.content.match(new RegExp(config.prefix, "i"))) {
                                if (!(message.id in this.commandCalls)) {
                                    if (!bot.command.isUserBanned(message)) {
                                        bot.command.handleCommand(message, true)
                                    }
                                }
                            }
                        })
                })
            })
    }
}

module.exports = new Message()