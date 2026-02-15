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
const SlashHandler = require("./slashHandler")
const UserHandler = require("./userHandler")

class Bot {
    constructor() {
        this.client = new discord.Client({
            intents: [
                discord.GatewayIntentBits.DirectMessages,
                discord.GatewayIntentBits.DirectMessageTyping,
                discord.GatewayIntentBits.Guilds,
                discord.GatewayIntentBits.GuildMembers,
                discord.GatewayIntentBits.GuildModeration,
                discord.GatewayIntentBits.GuildExpressions,
                discord.GatewayIntentBits.GuildIntegrations,
                discord.GatewayIntentBits.GuildWebhooks,
                discord.GatewayIntentBits.GuildInvites,
                discord.GatewayIntentBits.GuildVoiceStates,
                discord.GatewayIntentBits.GuildPresences,
                discord.GatewayIntentBits.GuildMessages,
                discord.GatewayIntentBits.GuildMessageReactions,
                discord.GatewayIntentBits.GuildMessageTyping,
                discord.GatewayIntentBits.MessageContent,
            ],
            partials: [discord.Partials.Channel]
        })

        this.login()
        setInterval(this.login.bind(this), 5 * 60 * 1000)

        this.client.once("clientReady", async () => {
            await this.loadSystems()
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

            if (process.argv.includes("--beta")) {
                logger.startup("Logging in with beta key")
                this.client.login(config.discord_api_key_beta)
            } else {
                this.client.login(config.discord_api_key)
            }
        }
    }

    async loadSystems() {
        this.database = require("./database")

        this.messageHandler = new MessageHandler(this)
        this.eventListener = new EventListener(this)
        this.backupHandler = new BackupHandler(this)
        this.replyHandler = new ReplyHandler(this)
        this.commandHandler = new CommandHandler(this)
        this.dictionary = new Dictionary()
        this.emoteInjector = new EmoteInjector(this)
        this.SlashHandler = new SlashHandler(this)
        this.userHandler = new UserHandler(this)

        this.loadDisallowed()
        await this.registerSlashCommands()

        this.logger = logger
    }

    async registerSlashCommands() {
        const { commands } = require("./commandLoader")
        await this.SlashHandler.registerCommands(commands)
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