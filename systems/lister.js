class Lister {
    constructor() {
        if (this.constructor === Lister) {
            throw new Error("Can't instantiate abstract class!")
        }
    }

    process(message) {
        const mentioned = message.mentions.users.first()
        const args = message.content.split(' ')

        if (args.length == 1) {
            this.total(message)
        } else if (mentioned) {
            this.mention(message, mentioned)
        } else if (args[1] == "?") {
            this.perPerson(message)
        } else if (args[1] == "%") {
            this.percentage(message)
        } else {
            bot.message.reply(message, 'Incorrect format')
        }
    }

    total(message) {
        bot.message.reply(message, 'This command does not work without a target')
    }

    mention(message, mentioned) {
        bot.message.reply(message, 'This command does not work with @')
    }

    perPerson(message) {
        bot.message.reply(message, 'This command does not work with ?')
    }

    percentage(message) {
        bot.message.reply(message, 'This command does not work with %')
    }
}
