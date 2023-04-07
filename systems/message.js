let config = require('../config.json')
let database = require('./database.js')

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
            markComplete(call)
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
            markComplete(call)
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
        console.log(this.commandCalls[reply.id])
        reply.channel.messages.fetch(this.commandCalls[reply.id]).then((message) => { })
        reply.delete({ timeout: 5000 })
    }

    markComplete(call) {
        let insert = database.db.prepare('INSERT OR IGNORE INTO command_calls (call_id, timestamp) VALUES (?, ?)',
            [call.id, call.createdAt.getTime()])
        insert.run(function (err) {
            if (err) {
                logger.error(err)
            }
        })
    }

    addCommandCall(call, reply) {
        this.commandCalls[call.id] = reply.id

        let insert = database.db.prepare('INSERT OR IGNORE INTO command_calls (call_id, reply_id, timestamp) VALUES (?, ?, ?)',
            [call.id, reply.id, reply.createdAt.getTime()])
        insert.run(function (err) {
            if (err) {
                logger.error(err)
            }
        })
    }

    getCommandCalls() {
        let selectSQL = `SELECT call_id, reply_id, timestamp FROM command_calls 
        WHERE timestamp > ${new Date() - 24 * 60 * 60 * 1000}
        ORDER BY timestamp DESC`

        database.query(selectSQL, [], (rows) => {
            for (let i = 0; i < rows.length; i++) {
                this.commandCalls[rows[i]['call_id']] = rows[i]['reply_id']
            }
            this.scanForCommands()
        })
    }

    scanForCommands() {
        logger.startup(`Reading messages since startup`);

        bot.client.channels.cache
            .filter(channel => channel.type === "GUILD_TEXT" && channel.viewable)
            .each(async channel => {
                const messages = await channel.messages.fetch({ limit: 100 })
                const yesterday = Date.now() - 24 * 60 * 60 * 1000

                messages.each(async message => {
                    const messageTime = message.createdTimestamp

                    if (bot.command.isUserAllowed(message), false) {
                        if (messageTime > yesterday && message.content.match(new RegExp(config.prefix, "i"))) {
                            if (!(message.id in this.commandCalls)) {
                                await bot.command.handleCommand(message, true)
                            }
                        }
                    }
                })
            })
    }
}

module.exports = new Message()