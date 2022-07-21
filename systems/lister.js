class Lister {
    constructor() {
    }

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
            message.reply('Incorrect format')
		}
    }

    total(message) {
        message.reply('This command does not work without a target')
    }

    mention(message, mentioned) {
        message.reply('This command does not work with @')
    }
    
    perPerson(message) {
        message.reply('This command does not work with ?')
    }

    percentage(message) {
        message.reply('This command does not work with %')
    }
}
