class Bot {
    constructor() {
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

        this.login()
        setInterval(this.login.bind(this), 5 * 60 * 1000)

        this.message = require('./message.js')
        this.eventListener = require('./eventListener.js')(this)
        this.command = require('./command.js')

        this.client.on('ready', () => {
            this.client.user.setPresence({
                activities: [{
                    name: `Running Version ${global.package.version}`
                }]
            })
            logger.startup(`Logged in as: ${this.client.user.username} - ${global.package.version} - ${this.client.user.id}`)
        })
    }

    login() {
        if (!this.client.isReady()) {
            logger.startup(`Attempting to log in`)
            this.client.login(config.discord_api_key)
        }
    }
}
module.exports = new Bot()