let config = require('../config.json')
let fs = require('fs')

class Command {
    constructor() {
        this.commands = require('../commandholders/commands.js')
        this.admincommands = require('../commandholders/admincommands.js')

        // person as key -> time as value
        this.lastRequest = []

        this.messageCounter = 0
        this.lastMessageSent = new Date()
    }

    handleCommand(message, readback = false) {
        const isCommand = message.content.match(new RegExp(config.prefix, "i")) && !message.author.equals(bot.user)
        if (isCommand) {
            const { command, args } = this.parseMessageArguments(message)

            logger.debug(`'${message.author.username}' issued '${command}'${args.length >= 1 ? ` with arguments '${args}'` : ''} in channel '${message.channel.name}' in server '${message.channel.guild.name}' ${readback ? 'is a readback command' : ''}`)

            if (message.member.permissions.has("ADMINISTRATOR") || isUserAllowed(message, readback)) {
                this.handleCommandType(command, args, readback, message)
            }
        } else if (!message.author.bot) {
            this.handleNonCommandMessage(message)
        }
    }

    parseMessageArguments(message) {
        const args = message.content.removePrefix().normalizeSpaces().split(' ')
        const command = args.shift().toLowerCase()
        return { command, args }
    }

    handleCommandType(command, args, readback, message) {
        if (command in this.commands) {
            this.commands[command].function(message)
        } else if (command in this.admincommands) {
            this.handleAdminCommand(command, message)
        } else if (!readback) {
            bot.message.reply(message, `${command.capitalize()} is not a command, please try again.`)
        } else {
            bot.message.markComplete(message)
        }
    }

    handleAdminCommand(command, message) {
        if (message.author.id === config.owner || message.member.permissions.has("ADMINISTRATOR")) {
            this.admincommands[command](message)
        } else {
            bot.message.reply(message, `${command.capitalize()} is an admin command, and you are not allowed to use it.`)
        }
    }

    handleNonCommandMessage(message) {
        if (!message.author.bot) {
            let currentTimestamp = new Date()
            let timePassed = new Date(currentTimestamp.getTime() - this.lastMessageSent.getTime()).getMinutes()

            if (!bot.reply.process(message)) {
                if ((this.messageCounter >= config.speakEvery || bot.logic.randomBetween(1, 20) == 1) && timePassed >= bot.logic.randomBetween(20, 60)) {
                    this.commands['speak'].function(message)
                    this.lastMessageSent = currentTimestamp
                    this.messageCounter = 0
                } else if (message.content.match(new RegExp(/\bbot(je)?\b/, "gi"))) {
                    if (message.member.permissions.has("ADMINISTRATOR") || this.isUserAllowed(message, false))
                        this.commands['speak'].function(message)
                }
            }
            this.messageCounter++
        }
    }

    redo(message) {
        message.channel.messages.fetch(bot.message.findFromReply(message))
            .then(callMessage => {
                let args = callMessage.content.removePrefix().normalizeSpaces().split(' ')
                const command = args.shift().toLowerCase()

                logger.debug(`Redoing this command == '${callMessage.author.username}' issued '${command}'${args.length >= 1 ? ` with arguments '${args}'` : ''} in channel '${message.channel.name}' in server '${message.channel.guild.name}'`)

                if (command in this.commands) {
                    this.commands[command].function(callMessage)
                    message.delete()
                }
            })
    }

    isUserAllowed(message, canSendMessage) {
        let disallowed = JSON.parse(fs.readFileSync('./json/disallowed.json'))
        if (message.author.id in disallowed)
            return false
        else if (config.spamchecker === 0)
            return true

        const currentTimestamp = new Date()

        if (!(message.author.username in this.lastRequest)) {
            this.lastRequest[message.author.username] = currentTimestamp
        } else {
            if ((currentTimestamp - this.lastRequest[message.author.username] < (config.timeoutDuration * 1000))) {
                let difference = new Date(currentTimestamp.getTime() - this.lastRequest[message.author.username].getTime())
                if (canSendMessage)
                    bot.message.send(message, `You need to wait ${(config.timeoutDuration - difference.getSeconds())} seconds`)
                return false
            } else {
                this.lastRequest[message.author.username] = currentTimestamp
            }
        }
        return true
    }

    handleDM(message) {
        if (!message.author.bot) {
            console.log(message)
            this.commands['speak'].function(message)
        }
    }
}

module.exports = new Command()