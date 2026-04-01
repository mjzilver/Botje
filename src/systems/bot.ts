import fs from "fs";
import path from "path";
import * as discord from "discord.js";
import { Pool } from "pg";
import type { BotConfig } from "../interfaces/config";
import type { ILogger } from "../interfaces";
import { toBotMessage } from "./messageAdapter";
import { Database } from "./database";
import { MessageHandler } from "./messageHandler";
import { CommandHandler } from "./commandHandler";
import { EventListener } from "./eventListener";
import { ReplyHandler } from "./replyHandler";
import { SlashHandler } from "./slashHandler";
import { UserHandler } from "./userHandler";
import { EmoteInjector } from "./emoteInjector";
import { WebhookService } from "./webhook";
import { BackupHandler } from "./backupHandler";
import { Dictionary } from "./dictionary";
import { HangmanGame } from "./hangman";
import { Pagination } from "./pagination";
import { loadCommands, type LoadedCommands } from "./commandLoader";
import { setBotContext } from "./botContext";
import { LlmService } from "./llm";
import replyPatterns from "../json/reply.json";
const DISALLOWED_PATH = path.resolve(__dirname, "../json/disallowed.json");
export class Bot {
    client: discord.Client;
    config: BotConfig;
    logger: ILogger;
    disallowed: Record<string, boolean> = {};
    database!: Database;
    messageHandler!: MessageHandler;
    commandHandler!: CommandHandler;
    replyHandler!: ReplyHandler;
    slashHandler!: SlashHandler;
    userHandler!: UserHandler;
    emoteInjector!: EmoteInjector;
    webhook!: WebhookService;
    backupHandler!: BackupHandler;
    dictionary!: Dictionary;
    hangman!: HangmanGame;
    pagination!: Pagination;
    llm!: LlmService;
    eventListener!: EventListener;
    loadedCommands!: LoadedCommands;
    private version: string;
    constructor(config: BotConfig, logger: ILogger, version = "3.0.0") {
        this.config = config;
        this.logger = logger;
        this.version = version;
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
            partials: [discord.Partials.Channel],
        });
        this.client.once("clientReady", async () => {
            await this.loadSystems();
            this.client.user?.setPresence({
                activities: [{ name: `Version ${this.version}` }],
            });
            logger.startup(`Logged in as: ${this.client.user?.username} - ${this.version} - ${this.client.user?.id}`);
        });
        this.login();
        setInterval(() => this.login(), 5 * 60 * 1000);
    }
    login(): void {
        if (!this.client.isReady()) {
            this.logger.startup("Attempting to log in");
            const key = process.argv.includes("--beta")
                ? this.config.discord_api_key_beta
                : this.config.discord_api_key;
            if (process.argv.includes("--beta")) this.logger.startup("Logging in with beta key");
            this.client.login(key);
        }
    }
    private async loadSystems(): Promise<void> {
        this.loadDisallowed();
        const pool = new Pool({
            user: this.config.db.user,
            host: this.config.db.host,
            database: this.config.db.database,
            password: this.config.db.password,
            port: this.config.db.port,
        });
        this.database = new Database(pool, this.logger, this.config);
        await this.database.initialize();
        this.messageHandler = new MessageHandler(this.database, this.logger, this.config);
        await this.messageHandler.loadCommandCalls();
        this.replyHandler = new ReplyHandler(this.messageHandler, this.logger, replyPatterns);
        this.dictionary = new Dictionary(this.database, this.logger);
        this.hangman = new HangmanGame(this.messageHandler, this.dictionary, this.config, this.logger);
        this.pagination = new Pagination(this.messageHandler);
        this.llm = new LlmService(this.config.llm, this.logger, this.messageHandler);
        const loadedCommands = loadCommands(path.resolve(__dirname, ".."), this.logger);
        this.loadedCommands = loadedCommands;
        this.commandHandler = new CommandHandler({
            commands: loadedCommands,
            messageHandler: this.messageHandler,
            replyHandler: this.replyHandler,
            logger: this.logger,
            config: this.config,
            disallowed: this.disallowed,
            getBotUser: () => this.client.user,
            context: this,
        });
        this.messageHandler.setCommandListRemover((msg) => this.commandHandler.commandList.remove(msg));
        this.webhook = new WebhookService(this.logger, this.client);
        this.emoteInjector = new EmoteInjector(this.webhook, this.messageHandler, this.client);
        this.userHandler = new UserHandler(this.database, this.logger, this.client);
        this.backupHandler = new BackupHandler(this.logger, this.config, this.client);
        this.slashHandler = new SlashHandler(this.logger, this.client, this);
        await this.slashHandler.registerCommands(loadedCommands.commands);
        this.eventListener = new EventListener(
            this.client,
            this.database,
            this.commandHandler,
            this.messageHandler,
            this.emoteInjector,
            this.slashHandler,
            this.backupHandler,
            this.config,
            this.logger,
            this.disallowed,
        );
        setBotContext(this);
        if (this.config.scan_on_startup === true || this.config.scan_on_startup === "1") this.scanOnStartup();
    }
    private scanOnStartup(): void {
        this.logger.startup("Reading messages since startup");
        const yesterday = Date.now() - 24 * 60 * 60 * 1000;
        this.client.channels.cache
            .filter((ch) => ch.type === discord.ChannelType.GuildText && (ch as discord.TextChannel).viewable)
            .forEach((ch) => {
                const textChannel = ch as discord.TextChannel;
                textChannel.messages
                    .fetch({ limit: 100 })
                    .then((messages: discord.Collection<string, discord.Message>) => {
                        messages
                            .filter((m: discord.Message) => m.createdTimestamp > yesterday)
                            .forEach((m: discord.Message) => {
                                const msg = toBotMessage(m);
                                this.database.storeMessage(msg);
                                if (m.content.match(new RegExp(this.config.prefix, "i"))) {
                                    const calls = this.messageHandler.getCommandCalls();
                                    if (!(m.id in calls))
                                        if (!this.commandHandler.isUserBanned(msg))
                                            this.commandHandler.handleCommand(msg, true);
                                }
                            });
                    });
            });
    }
    private loadDisallowed(): void {
        try {
            if (fs.existsSync(DISALLOWED_PATH)) {
                const data = fs.readFileSync(DISALLOWED_PATH, "utf8");
                this.disallowed = JSON.parse(data);
            } else {
                fs.writeFileSync(DISALLOWED_PATH, "{}", "utf8");
                this.disallowed = {};
            }
        } catch (err) {
            this.logger.error(`Error loading disallowed.json: ${err}`);
            this.disallowed = {};
        }
    }
}
