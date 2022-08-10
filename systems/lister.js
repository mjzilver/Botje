class Lister {
    constructor() { }

    process(message) {
        const mentioned = message.mentions.users.first()
        const args = message.content.split(' ')

        if (args.length == 1) {
            total(message)
        } else if (mentioned) {
            mention(message, mentioned)
        } else if (args[1] == "?") {
            perPerson(message)
        } else if (args[1] == "%") {
            percentage(message)
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
