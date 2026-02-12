const { PermissionFlagsBits } = require("discord.js")

const logger = require("./logger")
const { config } = require("./settings")
const LimitedList = require("./types/limitedList")
const { randomBetween } = require("./utils")

module.exports = class CommandHandler {
    constructor(bot) {
        this.bot = bot

        this.commands = require("./commandLoader").commands
        this.admincommands = require("./commandLoader").admincommands
        this.dmcommands = require("./commandLoader").dmcommands

        // person as key -> time as value
        this.lastRequest = []
        this.commandList = new LimitedList(10)

        this.messageCounter = 0
        this.lastMessageSent = new Date()
    }

    handleCommand(message, isReadback = false) {
        const isCommand = message.content.match(new RegExp(config.prefix, "i")) && !message.author.equals(this.bot.user)
        if (isCommand) {
            const { command, args } = this.parseMessageArguments(message)

            logger.debug(`'${message.author.username}' issued '${command}'${args.length >= 1 ? ` with arguments '${args}'` : ""} in channel '${message.channel.name}' in server '${message.channel.guild.name}' ${isReadback ? "is a readback command" : ""}`)
            if (!isReadback)
                this.commandList.push(message)

            if (message.member.permissions.has(PermissionFlagsBits.Administrator) || this.isUserAllowed(message, !isReadback))
                this.handleCommandType(command, args, isReadback, message)
        } else if (!message.author.bot) {
            this.handleNonCommandMessage(message)
        }
    }

    parseMessageArguments(message) {
        const args = message.content.removePrefix().normalizeSpaces().split(" ")
        const command = args.shift().toLowerCase()
        return { command, args }
    }

    handleCommandType(command, args, readback, message) {
        if (command in this.commands)
            this.commands[command].function(message)
        else if (command in this.admincommands)
            this.handleAdminCommand(command, message)
        else if (!readback)
            this.bot.messageHandler.reply(message, `${command.capitalize()} is not a command, please try again.`)
        else
            this.bot.messageHandler.markComplete(message)
    }

    handleAdminCommand(command, message) {
        if (message.author.id === config.owner || message.member.permissions.has(PermissionFlagsBits.Administrator))
            this.admincommands[command](message)
        else
            this.bot.messageHandler.reply(message, `${command.capitalize()} is an admin command, and you are not allowed to use it.`)
    }

    handleNonCommandMessage(message) {
        if (!message.author.bot) {
            const currentTimestamp = new Date()
            const timePassed = new Date(currentTimestamp.getTime() - this.lastMessageSent.getTime()).getMinutes()

            if (!this.bot.replyHandler.process(message))
                if ((this.messageCounter >= config.speakEvery || randomBetween(1, 20) === 1) && timePassed >= randomBetween(20, 60)) {
                    this.commands["speak"].function(message)
                    this.lastMessageSent = currentTimestamp
                    this.messageCounter = 0
                } else if (message.content.match(new RegExp(/\bbot(je)?\b/, "gi"))) {
                    if (message.member.permissions.has(PermissionFlagsBits.Administrator) || this.isUserAllowed(message, false))
                        this.commands["speak"].function(message)
                }

            this.messageCounter++
        }
    }

    redo(message) {
        message.channel.messages.fetch(this.bot.messageHandler.findFromReply(message))
            .then(callMessage => {
                const args = callMessage.content.removePrefix().normalizeSpaces().split(" ")
                const command = args.shift().toLowerCase()

                logger.debug(`Redoing this command === '${callMessage.author.username}' issued '${command}'${args.length >= 1 ? ` with arguments '${args}'` : ""} in channel '${message.channel.name}' in server '${message.channel.guild.name}'`)

                if (command in this.commands) {
                    this.commands[command].function(callMessage)
                    this.bot.messageHandler.delete(message)
                }
            })
    }

    isUserBanned(message) {
        if (message.author.id in this.bot.disallowed)
            return true
        return false
    }

    isUserAllowed(message, canSendMessage = false) {
        if (this.isUserBanned(message))
            return false

        const currentTimestamp = new Date()

        if (!(message.author.username in this.lastRequest)) {
            this.lastRequest[message.author.username] = currentTimestamp
            return true // no previous request found
        }

        const elapsedTime = currentTimestamp - this.lastRequest[message.author.username]
        if (elapsedTime < config.timeoutDuration * 1000) {
            const remainingTime = Math.ceil((config.timeoutDuration * 1000 - elapsedTime) / 1000)
            if (canSendMessage)
                this.bot.messageHandler.send(message, `Please wait ${remainingTime} second${remainingTime > 1 ? "s" : ""} before making another request.`)

            return false // too soon
        }

        this.lastRequest[message.author.username] = currentTimestamp
        return true // enough time has elapsed
    }

    handleDM(message) {
        if (!message.author.bot) {
            const { command } = this.parseMessageArguments(message)

            if (command in this.dmcommands)
                this.dmcommands[command].function(message)
            else if (message.content.match(new RegExp(config.prefix, "i")))
                this.bot.messageHandler.reply(message, "Use the command b!help for more information")
        }
    }
}