import path from "path";
import * as discord from "discord.js";
import { Pool } from "pg";
import type { BotConfig } from "../interfaces/config";
import type { ILogger, IBotContext } from "../interfaces";
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
import { LlmService } from "./llm";
import replyPatterns from "../json/reply.json";

export class SystemRegistry implements IBotContext {
    database!: Database;
    messageHandler!: MessageHandler;
    replyHandler!: ReplyHandler;
    dictionary!: Dictionary;
    hangman!: HangmanGame;
    pagination!: Pagination;
    llm!: LlmService;
    commandHandler!: CommandHandler;
    webhook!: WebhookService;
    emoteInjector!: EmoteInjector;
    userHandler!: UserHandler;
    backupHandler!: BackupHandler;
    slashHandler!: SlashHandler;
    eventListener!: EventListener;
    loadedCommands!: LoadedCommands;
    disallowed!: Record<string, boolean>;
    readonly config: BotConfig;
    readonly logger: ILogger;
    readonly client: discord.Client;
    constructor(config: BotConfig, logger: ILogger, client: discord.Client) {
        this.config = config;
        this.logger = logger;
        this.client = client;
    }

    async initialize(disallowed: Record<string, boolean>): Promise<void> {
        this.disallowed = disallowed;
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
    }
}
