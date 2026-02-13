const logger = require("./logger")

class MessageIterator {
    constructor(options = {}) {
        this.onMessage = options.onMessage || (() => {})
        this.onComplete = options.onComplete || null
        this.limit = options.limit || Infinity
        this.logProgress = options.logProgress !== false

        this.stats = {
            totalProcessed: 0
        }
    }

    async iterate(channel, startMessageId = null) {
        const messageId = startMessageId || channel.lastMessageId
        if (!messageId) {
            if (this.logProgress)
                logger.console(`No messages found in ${channel.name}`)

            this.onComplete?.(this.stats)
            return
        }

        await this.fetchBatch(channel, messageId)
    }

    async fetchBatch(channel, messageId) {
        const remaining = this.limit - this.stats.totalProcessed
        if (remaining <= 0) {
            if (this.logProgress)
                logger.console(`Limit reached: ${this.stats.totalProcessed} messages processed from ${channel.name}`)

            this.onComplete?.(this.stats)
            return
        }

        const fetchLimit = Math.min(100, remaining)

        try {
            const messages = await channel.messages.fetch({
                limit: fetchLimit,
                before: messageId
            })

            if (messages.size === 0) {
                if (this.logProgress)
                    logger.console(`End reached: ${this.stats.totalProcessed} messages processed from ${channel.name}`)

                this.onComplete?.(this.stats)
                return
            }

            let lastMessageId = messageId
            for (const [id, message] of messages) {
                await this.onMessage(message)
                lastMessageId = id
                this.stats.totalProcessed++
            }

            // Log progress
            if (this.logProgress && messages.size === 100)
                logger.console(`${this.stats.totalProcessed} messages processed from ${channel.name} in ${channel.guild?.name || "DM"}`)

            // Continue if we fetched a full batch and haven't reached the limit
            if (messages.size === 100 && this.stats.totalProcessed < this.limit) {
                await this.fetchBatch(channel, lastMessageId)
            } else {
                if (this.logProgress)
                    logger.console(`End reached: ${this.stats.totalProcessed} messages processed from ${channel.name}`)

                this.onComplete?.(this.stats)
            }
        } catch (error) {
            logger.error(`Error fetching messages from ${channel.name}: ${error.message}`)
            this.onComplete?.(this.stats)
        }
    }
}

module.exports = MessageIterator
