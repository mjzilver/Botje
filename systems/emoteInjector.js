const webhook = require("./webhook")

module.exports = class EmoteInjector {
    constructor(bot) {
        this.bot = bot
    }

    handleMessage(message) {
        if (message.author.bot) return

        const matches = Array.from(new Set(
            [...message.content.matchAll(/(?<!<a?):([a-zA-Z0-9_]+):(?!\d+>)/g)]
                .map(m => m[1])
        ))
        let correctedMessage = message.content
        let hasCorrections = false

        for (const match of matches) {
            const emoji = message.guild.emojis.cache.find(e => e.name === match)

            if (emoji) continue

            for (const [guildId, guild] of this.bot.client.guilds.cache.entries()) {
                if (guildId === message.guild.id) continue

                const otherEmoji = guild.emojis.cache.find(e => e.name === match)

                if (otherEmoji) {
                    const regex = new RegExp(`(?<!<):${match}:(?!\\d+>)`, "g")
                    correctedMessage = correctedMessage.replace(regex, `<:${otherEmoji.name}:${otherEmoji.id}>`)
                    hasCorrections = true
                    break
                }
            }
        }

        if (hasCorrections) {
            webhook.sendMessage(message.channel.id, correctedMessage, message.author.id, this.bot)
            message.delete()
        }
    }
}
