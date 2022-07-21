class Bot {
    constructor() {
        this.commands = require('../commandholders/commands.js')
        this.admincommands = require('../commandholders/admincommands.js')

        // person as key -> time as value
        this.lastRequest = []

        this.messageCounter = 0
        this.lastMessageSent = new Date()

        this.client = new discord.Client({
            intents: [
                'GUILDS',
                'GUILD_MEMBERS',
                'GUILD_BANS',
                'GUILD_EMOJIS_AND_STICKERS',
                'GUILD_INTEGRATIONS',
                'GUILD_WEBHOOKS',
                'GUILD_INVITES',
                'GUILD_VOICE_STATES',
                'GUILD_PRESENCES',
                'GUILD_MESSAGES',
                'GUILD_MESSAGE_REACTIONS',
                'GUILD_MESSAGE_TYPING',
            ],
            autoReconnect: true
        })

        this.client.on('ready', () => {
            this.client.user.setPresence({
                activities: [{
                    name: `Running Version ${global.package.version}`
                }]
            })
            logger.console(`Logged in as: ${this.client.user.username} - ${this.client.user.id}`)
            logger.console(`Running Version ${global.package.version}`)
        })

        this.client.login(config.discord_api_key)

        this.client.on('error', function (error) {
            logger.error(error.message)
        })

        this.client.on('messageCreate', message => {
            database.storemessage(message)

            // look for the b! meaning bot command
            if (message.content.match(new RegExp(config.prefix, "i")) && !message.author.equals(bot.user)) {
                message.content = message.content.replace(new RegExp(config.prefix, "i"), '')
                message.content = message.content.normalizeSpaces()
                const args = message.content.split(' ')
                const command = args.shift().toLowerCase()

                logger.debug(`'${message.author.username}' issued '${command}'${args.length >= 1 ? ` with arguments '${args}'` : ''} in channel '${message.channel.name}' in server '${message.channel.guild.name}'`)

                if (this.isUserAllowed(message) || message.member.permissions.has("ADMINISTRATOR")) {
                    if (command in this.commands) {
                        return this.commands[command].function(message)
                    } else if (command in this.admincommands) {
                        if (message.author.id === config.owner || message.member.permissions.has("ADMINISTRATOR"))
                            return this.admincommands[command](message)
                        else
                            message.channel.send(`${command.capitalize()} is an admin command, you are not allowed`)
                    } else {
                        message.channel.send(`${command.capitalize()} is not a command, retard`)
                    }
                }
            } else if (!message.author.bot) {
                var currentTimestamp = new Date()
                var timepassed = new Date(currentTimestamp.getTime() - this.lastMessageSent.getTime()).getMinutes()

                if (!replysystem.process(message)) {
                    if ((this.messageCounter >= config.speakEvery || randomBetween(1, 20) == 1) && timepassed >= randomBetween(20, 60)) {
                        if(message.attachments.size >= 1 || message.embeds.length >= 1) {
                            this.commands['meme'].function(message)
                        } else {
                            this.commands['speak'].function(message)
                        }
                        this.lastMessageSent = currentTimestamp
                        this.messageCounter = 0
                    } else if (message.content.match(new RegExp(/\bbot(je)?\b/, "gi"))) {
                        if (this.isUserAllowed(message))
                            this.commands['speak'].function(message)
                    }
                }
                this.messageCounter++
            }
        })

        this.client.on('messageDelete', message => {
            logger.admin(`This Message has been deleted: ${message.author.username}: ${message.content} == Posted in channel '${message.channel.name}' in server '${message.channel.guild.name} == Send at: ${new Date(message.createdTimestamp).toUTCString()}`)
        })

        this.client.on('emojiCreate', emoji => {
            backupsystem.saveEmoji(emoji)
        })

        this.client.on('emojiDelete', emoji => {
            backupsystem.saveEmoji(emoji, new Date().getTime())
        })

        this.client.on('emojiUpdate', (oldEmoji, newEmoji) => {
            backupsystem.saveEmoji(oldEmoji, new Date().getTime())
            backupsystem.saveEmoji(newEmoji)
        })
    }

    isUserAllowed(message) {
        var disallowed = JSON.parse(fs.readFileSync('./json/disallowed.json'))
        if (message.author.id in disallowed) {
            return false
        }
        var currentTimestamp = new Date()

        if (!(message.author.username in this.lastRequest)) {
            this.lastRequest[message.author.username] = currentTimestamp
        } else {
            if ((currentTimestamp - this.lastRequest[message.author.username] < (config.timeoutDuration * 1000))) {
                var difference = new Date(currentTimestamp.getTime() - this.lastRequest[message.author.username].getTime())
                message.channel.send(`You need to wait ${(config.timeoutDuration - difference.getSeconds())} seconds`)
                return false
            } else {
                this.lastRequest[message.author.username] = currentTimestamp
            }
        }
        return true
    }
}
module.exports = new Bot()