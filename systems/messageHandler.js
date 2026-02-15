const discord = require("discord.js")

const database = require("./database")
const logger = require("./logger")
const { config } = require("./settings")

module.exports = class MessageHandler {
    constructor(bot) {
        this.bot = bot
        this.commandCalls = {}
        this.getCommandCalls()
    }

    _sendMessage(call, content, useReply) {
        if (!content) {
            logger.error(`Content empty could not send, call: "${call}"`)
            this.markComplete(call)
            return
        }

        let promise

        if (call.isSlashCommand && call.interaction) {
            const alreadyDeferredOrReplied = call.interaction.deferred || call.interaction.replied
            promise = alreadyDeferredOrReplied
                ? call.interaction.followUp(content)
                : call.interaction.reply(content)
        } else {
            promise = useReply ? call.reply(content).catch(err => {
                logger.error("Failed to reply to message (likely deleted):", err.message)
                throw err
            }) : call.channel.send(content)
        }

        promise.then(reply => {
            this.addCommandCall(call, reply)
            if (reply.react) {
                this.react(reply, config.positive_emoji)
                this.react(reply, config.negative_emoji)
            }
        }).catch(() => {})

        return promise
    }

    send(call, content) {
        return this._sendMessage(call, content, false)
    }

    reply(call, content) {
        return this._sendMessage(call, content, true)
    }

    react(message, emoji) {
        return message.react(emoji).catch(err => {
            logger.debug(`Failed to react to message (likely deleted): ${err.message}`)
        })
    }

    edit(replyObj, newContent) {
        return new Promise((resolve, reject) => {
            if (!replyObj)
                return reject(new Error("No reply object"))

            replyObj.edit(newContent)
                .then(resolve)
                .catch(err => {
                    logger.debug(`Failed to edit message (likely deleted): ${err.message}`)
                    reject(err)
                })
        })
    }

    delete(message) {
        return message.delete().catch(err => {
            logger.debug(`Failed to delete message (likely already deleted): ${err.message}`)
        })
    }

    findFromReply(replyMessage) {
        for (const [call, reply] of Object.entries(this.commandCalls))
            if (reply === replyMessage.id)
                return call
    }

    markComplete(call) {
        const insertSQL = `INSERT INTO command_calls (call_id, reply_id, timestamp) 
        VALUES ($1::bigint, $2::bigint, $3::bigint) 
        ON CONFLICT (call_id) DO UPDATE SET reply_id = EXCLUDED.reply_id;`
        database.insert(insertSQL, [call.id, null, call.createdAt.getTime()])
        this.bot.commandHandler.commandList.remove(call)
    }

    addCommandCall(call, reply) {
        this.commandCalls[call.id] = reply.id

        const insertSQL = `INSERT INTO command_calls (call_id, reply_id, timestamp) 
        VALUES ($1::bigint, $2::bigint, $3::bigint) 
        ON CONFLICT (call_id) DO UPDATE SET reply_id = EXCLUDED.reply_id;`
        database.insert(insertSQL, [call.id, reply.id, reply.createdAt.getTime()])
        this.bot.commandHandler.commandList.remove(call)
    }

    async getCommandCalls() {
        const selectSQL = `SELECT call_id, reply_id, timestamp FROM command_calls 
        WHERE timestamp > ${new Date() - 24 * 60 * 60 * 1000}
        ORDER BY timestamp DESC`

        try {
            const rows = await database.query(selectSQL, [])
            for (let i = 0; i < rows.length; i++)
                this.commandCalls[rows[i]["call_id"]] = rows[i]["reply_id"]

            if (config.scan_on_startup === true)
                this.scanForCommands()
        } catch (err) {
            logger.error(err)
        }
    }

    scanForCommands() {
        logger.startup("Reading messages since startup")
        const yesterday = Date.now() - 24 * 60 * 60 * 1000

        this.bot.client.channels.cache
            .filter(channel => channel.type === discord.ChannelType.GuildText && channel.viewable)
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