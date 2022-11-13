class Message {
    constructor() {
        this.commandCalls = {}
        this.getCommandCalls()
    }

    send(call, content) {
        var promise = call.channel.send(content)
        promise.then((reply) => {
            this.addCommandCall(call, reply)
            reply.react(config.positive_emoji)
            reply.react(config.negative_emoji)
        })
        return promise
    }

    reply(call, content) {
        var promise = call.reply(content)
        promise.then((reply) => {
            this.addCommandCall(call, reply)
            reply.react(config.positive_emoji)
            reply.react(config.negative_emoji)
        })
        return promise
    }

    // under construction
    delete(reply) {
        console.log(this.commandCalls[reply.id])
        reply.channel.messages.fetch(this.commandCalls[reply.id]).then((message) => { })
        reply.delete({ timeout: 5000 })
    }

    markComplete(call) {
        this.commandCalls[call.id] = 0
        var insert = database.db.prepare('INSERT OR IGNORE INTO command_calls (call_id, timestamp) VALUES (?, ?)',
            [call.id, call.createdAt.getTime()])
        insert.run(function (err) {
            if (err) {
                logger.error(err)
            }
        })
    }

    addCommandCall(call, reply) {
        this.commandCalls[call.id] = reply.id
        var insert = database.db.prepare('INSERT OR IGNORE INTO command_calls (call_id, reply_id, timestamp) VALUES (?, ?, ?)',
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
            for (var i = 0; i < rows.length; i++) {
                this.commandCalls[rows[i]['call_id']] = rows[i]['reply_id']
            }
            this.scanForCommands()
        })
    }

    scanForCommands() {
        bot.client.on('ready', () => {
            for (const [channelId, channel] of bot.client.channels.cache.entries()) {
                if (channel.type == "GUILD_TEXT" && channel.viewable) {
                    channel.messages.fetch({
                        limit: 100
                    }).then(messages => {
                        var yesterday = new Date() - 24 * 60 * 60 * 1000
                        messages.forEach(
                            (message) => {
                                var messageTime = new Date(message.createdTimestamp)
                                if (messageTime > yesterday) {
                                    if (message.content.match(new RegExp(config.prefix, "i"))) {
                                        if (!(message.id in this.commandCalls)) {
                                            bot.command.handleCommand(message, true)
                                        }
                                    }
                                }
                            }
                        )
                    })
                }
            }
        })
    }
}

module.exports = new Message()