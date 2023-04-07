let discord = require('discord.js')
let projectPackage = require('../package.json')
let config = require('../config.json')

class Bot {
    constructor() {
        this.client = new discord.Client({
            intents: [
                'DIRECT_MESSAGES',
                'DIRECT_MESSAGE_TYPING',
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
            partials: ["CHANNEL"],
            autoReconnect: true
        })

        this.login()
        setInterval(this.login.bind(this), 5 * 60 * 1000)

        this.client.on('ready', () => {
            this.loadSystems()
            this.client.user.setPresence({
                activities: [{
                    name: `Running Version ${projectPackage.version}`
                }]
            })
            logger.startup(`Logged in as: ${this.client.user.username} - ${projectPackage.version} - ${this.client.user.id}`)
        })
    }

    login() {
        if (!this.client.isReady()) {
            logger.startup(`Attempting to log in`)
            this.client.login(config.discord_api_key)
        }
    }

    loadSystems() {
        this.message = require('./message.js')
        this.eventlistener = require('./eventlistener.js')
        this.command = require('./command.js')
        this.logic = require('./logic.js')
        this.backup = require('./backup.js')
        this.reply = require('./reply.js')
        this.dictionary = require('./dictionary.js')
    }
}
module.exports = new Bot()