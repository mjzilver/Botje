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

        this.client.on('ready', () => {
            this.client.user.setPresence({
                activities: [{
                    name: `Running Version ${global.package.version}`
                }]
            })
            logger.startup(`Logged in as: ${this.client.user.username} - ${global.package.version} - ${this.client.user.id}`)
        })

        this.client.on('shardError', function (error) {
            logger.error(`Shard error: ${error.message}`)
        })

        this.client.on('error', function (error) {
            logger.error(`Client error: ${error.message}`)
        })

        this.client.on('messageCreate', message => {
            database.storeMessage(message)
            command.handleCommand(message)
        })

        this.client.on('messageDelete', message => {
            logger.deletion(`This Message has been deleted: ${message.author.username}: ${message.content} == Posted in channel '${message.channel.name}' in server '${message.channel.guild.name} == Send at: ${new Date(message.createdTimestamp).toUTCString()}`)
        })

        this.client.on('emojiCreate', emoji => {
            backupsystem.saveEmoji(emoji)
        })

        this.client.on('emojiDelete', emoji => {
            backupsystem.saveEmoji(emoji, "_deleted")
        })

        this.client.on('emojiUpdate', (oldEmoji, newEmoji) => {
            backupsystem.saveEmoji(oldEmoji, "_old")
            backupsystem.saveEmoji(newEmoji)
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