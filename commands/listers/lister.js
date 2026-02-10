const bot = require("../../systems/bot")

class Lister {
    constructor() {
        if (this.constructor === Lister)
            throw new Error("Can't instantiate abstract class!")
    }

    parseArgs(message, options = {}) {
        const { preserveQuotes = false } = options

        const rawArgs = preserveQuotes
            ? message.content.match(/([^" ]+)|"([^"]+)"/gi)
            : message.content.split(" ")

        const args = rawArgs.slice(1)
        const mention = message.mentions.users.first()

        const hasLeaderboard = args.some(a =>
            a && ["leaderboard", "top", "?"].includes(a.toLowerCase()))
        const hasPercent = args.some(a =>
            a && ["percent", "percentage", "%"].includes(a.toLowerCase()))

        const filteredArgs = args.filter(a =>
            a && !["leaderboard", "top", "percent", "percentage", "?", "%"].includes(a.toLowerCase())
            && !a.startsWith("<@"))

        return {
            mention,
            leaderboard: hasLeaderboard,
            percent: hasPercent,
            args: filteredArgs
        }
    }

    process(message) {
        const { mention, leaderboard, percent } = this.parseArgs(message)

        if (mention)
            this.mention(message, mention)
        else if (leaderboard)
            this.perPerson(message)
        else if (percent)
            this.percentage(message)
        else
            this.total(message)
    }

    total(message) {
        bot.messageHandler.reply(message, "This command does not work without further commands")
    }

    mention(message) {
        bot.messageHandler.reply(message, "This command does not work with @")
    }

    perPerson(message) {
        bot.messageHandler.reply(message, "This command does not work with ?")
    }

    percentage(message) {
        bot.messageHandler.reply(message, "This command does not work with %")
    }
}

module.exports = Lister