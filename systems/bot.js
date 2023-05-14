let discord = require("discord.js")
let projectPackage = require("package.json")
let config = require("config.json")
let logger = require("systems/logger.js")
let fs = require("fs")

class Bot {
    constructor() {
        this.client = new discord.Client({
            intents: [
                "DIRECT_MESSAGES",
                "DIRECT_MESSAGE_TYPING",
                "GUILDS",
                "GUILD_MEMBERS",
                "GUILD_BANS",
                "GUILD_EMOJIS_AND_STICKERS",
                "GUILD_INTEGRATIONS",
                "GUILD_WEBHOOKS",
                "GUILD_INVITES",
                "GUILD_VOICE_STATES",
                "GUILD_PRESENCES",
                "GUILD_MESSAGES",
                "GUILD_MESSAGE_REACTIONS",
                "GUILD_MESSAGE_TYPING",
            ],
            partials: ["CHANNEL"],
            autoReconnect: true
        })

        this.login()
        setInterval(this.login.bind(this), 5 * 60 * 1000)

        this.client.on("ready", () => {
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
            logger.startup("Attempting to log in")
            this.client.login(config.discord_api_key)
        }
    }

    loadSystems() {
        this.message = require("systems/message.js")
        this.eventlistener = require("systems/eventlistener.js")
        this.command = require("systems/command.js")
        this.logic = require("systems/logic.js")
        this.backup = require("systems/backup.js")
        this.reply = require("systems/reply.js")
        this.dictionary = require("systems/dictionary.js")
        this.disallowed = JSON.parse(fs.readFileSync("json/disallowed.json"))
    }
}
module.exports = new Bot()