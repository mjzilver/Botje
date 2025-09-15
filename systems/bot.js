const fs = require("fs")

const discord = require("discord.js")

const logger = require("./logger")
const projectPackage = require("../package.json")
const BackupHandler = require("./backupHandler")
const CommandHandler = require("./commandHandler")
const Dictionary = require("./dictionary")
const EmoteInjector = require("./emoteInjector")
const EventListener = require("./eventListener")
const MessageHandler = require("./messageHandler")
const ReplyHandler = require("./replyHandler")
const { config } = require("./settings")

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
        this.database = require("./database")

        this.messageHandler = new MessageHandler(this)
        this.eventListener = new EventListener(this)
        this.backupHandler = new BackupHandler(this)
        this.replyHandler = new ReplyHandler(this)
        this.commandHandler = new CommandHandler(this)
        this.dictionary = new Dictionary()
        this.emoteInjector = new EmoteInjector(this)
        this.processHandler = require("./processHandler")

        this.loadDisallowed()

        this.logger = logger
    }

    loadDisallowed() {
        const disallowedFilepath = "json/disallowed.json"
        fs.readFile(disallowedFilepath, (err, data) => {
            if (!err && data)
                this.disallowed = JSON.parse(data)
            else
                fs.writeFile(disallowedFilepath, "{}", writeErr => {
                    if (writeErr)
                        logger.error("Error writing file:", writeErr)

                    this.disallowed = {}
                })
        })
    }
}
module.exports = new Bot()