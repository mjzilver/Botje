const database = require("./database")
const logger = require("./logger")
const { config } = require("./settings")

module.exports = class MessageHandler {
    constructor(bot) {
        this.bot = bot

        // Key = call.id, Value = reply.id
        this.commandCalls = {}
        this.getCommandCalls()
    }

    send(call, content) {
        if (content) {
            const promise = call.channel.send(content)
            promise.then(reply => {
                this.addCommandCall(call, reply)
                reply.react(config.positive_emoji)
                reply.react(config.negative_emoji)
            })
            return promise
        }
        logger.error(`Content empty could not send, call: "${call}"`)
        this.markComplete(call)
    }

    reply(call, content) {
        if (content) {
            const promise = call.reply(content)
            promise.then(reply => {
                this.addCommandCall(call, reply)
                reply.react(config.positive_emoji)
                reply.react(config.negative_emoji)
            })
            return promise
        }
        logger.error(`Content empty could not send, call: "${call}"`)
        this.markComplete(call)
    }

    edit(replyObj, newContent) {
        return new Promise((resolve, reject) => {
            if (!replyObj)
                return reject(new Error("No reply object"))

            replyObj.edit(newContent)
                .then(resolve)
                .catch(err => reject(err))
        })
    }

    findFromReply(replyMessage) {
        for (const [call, reply] of Object.entries(this.commandCalls))
            if (reply === replyMessage.id)
                return call
    }

    markComplete(call) {
        const insertSQL = `INSERT INTO command_calls (call_id, reply_id, timestamp) VALUES ($1::bigint, $2::bigint, $3::bigint) 
        ON CONFLICT (call_id) DO UPDATE SET reply_id = EXCLUDED.reply_id;`
        database.insert(insertSQL, [call.id, null, call.createdAt.getTime()])
        this.bot.commandHandler.commandList.remove(call)
    }

    addCommandCall(call, reply) {
        this.commandCalls[call.id] = reply.id

        const insertSQL = `INSERT INTO command_calls (call_id, reply_id, timestamp) VALUES ($1::bigint, $2::bigint, $3::bigint) 
        ON CONFLICT (call_id) DO UPDATE SET reply_id = EXCLUDED.reply_id;`
        database.insert(insertSQL, [call.id, reply.id, reply.createdAt.getTime()])
        this.bot.commandHandler.commandList.remove(call)
    }

    getCommandCalls() {
        const selectSQL = `SELECT call_id, reply_id, timestamp FROM command_calls 
        WHERE timestamp > ${new Date() - 24 * 60 * 60 * 1000}
        ORDER BY timestamp DESC`

        database.query(selectSQL, [], rows => {
            for (let i = 0; i < rows.length; i++)
                this.commandCalls[rows[i]["call_id"]] = rows[i]["reply_id"]

            if (config.scan_on_startup === true)
                this.scanForCommands()
        })
    }

    scanForCommands() {
        logger.startup("Reading messages since startup")
        const yesterday = Date.now() - 24 * 60 * 60 * 1000

        this.bot.client.channels.cache
            .filter(channel => channel.type === "GUILD_TEXT" && channel.viewable)
            .forEach(channel => {
                channel.messages.fetch({ limit: 100 }).then(messages => {
                    messages
                        .filter(message => message.createdTimestamp > yesterday)
                        .forEach(message => {
                            database.storeMessage(message)
                            if (message.content.match(new RegExp(config.prefix, "i")))
                                if (!(message.id in this.commandCalls))
                                    if (!this.bot.commandHandler.isUserBanned(message))
                                        this.bot.commandHandler.handleCommand(message, true)
                        })
                })
            })
    }
}