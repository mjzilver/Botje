const discord = require("discord.js")
const projectPackage = require("package.json")
const { config } = require("./settings")
const logger = require("systems/logger.js")
const fs = require("fs")
const MessageHandler = require("systems/messageHandler.js")
const EventListener = require("systems/eventListener.js")
const Logic = require("systems/logic.js")
const BackupHandler = require("./backupHandler")
const ReplyHandler = require("./reply")
const CommandHandler = require("./commandHandler")

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
                    name: `Version ${projectPackage.version}`
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
        this.messageHandler = new MessageHandler(this)
        this.eventListener = new EventListener(this)
        this.logic = new Logic()
        this.backup = new BackupHandler()
        this.replyHandler = new ReplyHandler(this)
        this.commandHandler = new CommandHandler(this)

        this.processHandler = require("systems/processHandler.js")
        this.dictionary = require("systems/dictionary.js")
        this.disallowed = JSON.parse(fs.readFileSync("json/disallowed.json"))

        this.database = require("systems/database.js")
        this.logger = logger
    }
}
module.exports = new Bot()