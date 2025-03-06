const webhook = require("systems/webhook.js")

module.exports = class EmoteInjector {
    constructor(bot) {
        this.bot = bot
    }

    handleMessage(message) {
        if (message.author.bot) return

        const matches = Array.from(message.content.matchAll(/(?<!<):([^:]+):(?!(?::\d+>))/g), m => m[1])
        let correctedMessage = message.content
        let hasCorrections = false

        for (const match of matches) {
            const emoji = message.guild.emojis.cache.find(e => e.name === match)

            if (emoji) {
                continue
            } else {
                let found = false

                for (const [guildId, guild] of this.bot.client.guilds.cache.entries()) {
                    if (guildId === message.guild.id) continue

                    const otherEmoji = guild.emojis.cache.find(e => e.name === match)

                    if (otherEmoji) {
                        correctedMessage = correctedMessage.replace(`:${match}:`, `<:${otherEmoji.name}:${otherEmoji.id}>`)
                        hasCorrections = true
                        found = true
                        break
                    }
                }

                if (!found)
                    continue
            }
        }

        if (hasCorrections) {
            webhook.sendMessage(message.channel.id, correctedMessage, message.author.id, this.bot)
            message.delete()
        }
    }
}
