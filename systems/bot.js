const discord = require("discord.js")
const projectPackage = require("package.json")
const { config } = require("./settings")
const logger = require("systems/logger.js")
const fs = require("fs")
const MessageHandler = require("systems/messageHandler.js")
const EventListener = require("systems/eventListener.js")
const Logic = require("systems/logic.js")
const BackupHandler = require("./backupHandler")
const ReplyHandler = require("./replyHandler")
const CommandHandler = require("./commandHandler")
const Dictionary = require("./dictionary")
const EmoteInjector = require("./emoteInjector")

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

            if (process.argv.includes("--dev")) {
                logger.startup("Logging in with dev key")
                this.client.login(config.discord_api_key_dev)
            } else {
                this.client.login(config.discord_api_key)
            }
        }
    }

    loadSystems() {
        this.database = require("systems/database.js")

        this.messageHandler = new MessageHandler(this)
        this.eventListener = new EventListener(this)
        this.logic = new Logic()
        this.backupHandler = new BackupHandler(this)
        this.replyHandler = new ReplyHandler(this)
        this.commandHandler = new CommandHandler(this)
        this.dictionary = new Dictionary()
        this.emoteInjector = new EmoteInjector(this)
        this.processHandler = require("systems/processHandler.js")

        const disallowedFilepath = "json/disallowed.json"
        fs.readFile(disallowedFilepath, (err, data) => {
            if (!err && data)
                this.disallowed = JSON.parse(data)
            else
                fs.writeFile(disallowedFilepath, "{}", (writeErr) => {
                    if (writeErr)
                        logger.error("Error writing file:", writeErr)

                    this.disallowed = {}
                })
        })

        this.logger = logger
    }
}
module.exports = new Bot()