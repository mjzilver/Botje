import path from "node:path";
import type * as discord from "discord.js";
import { BackupHandler } from "../features/backup/backupHandler";
import { EmoteInjector } from "../features/emoji/emoteInjector";
import { HangmanGame } from "../features/hangman/hangman";
import { Dictionary } from "../features/nlp/dictionary";
import { ReminderScheduler } from "../features/reminders/reminderScheduler";
import { CommandHandler } from "../handlers/commandHandler";
import { type LoadedCommands, loadCommands } from "../handlers/commandLoader";
import { EventListener } from "../handlers/eventListener";
import { MessageHandler } from "../handlers/messageHandler";
import { ReactionHandler } from "../handlers/reactionHandler";
import { ReplyHandler } from "../handlers/replyHandler";
import { SlashHandler } from "../handlers/slashHandler";
import { UserHandler } from "../handlers/userHandler";
import type { IBotContext, ILogger } from "../interfaces";
import type { BotConfig } from "../interfaces/config";
import replyPatterns from "../json/reply.json";
import { LlmService } from "../services/llm";
import { WebhookService } from "../services/webhook";
import { Pagination } from "../utils/support/pagination";
import { Database } from "./database";
import type { Settings } from "./settings";

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
    reactionHandler!: ReactionHandler;
    loadedCommands!: LoadedCommands;
    reminderScheduler!: ReminderScheduler;
    disallowed!: Record<string, boolean>;
    readonly config: BotConfig;
    readonly logger: ILogger;
    readonly client: discord.Client;
    settings!: Settings;
    constructor(settings: Settings, logger: ILogger, client: discord.Client) {
        this.config = settings.config;
        this.settings = settings;
        this.logger = logger;
        this.client = client;
    }

    private async initializeCoreServices(): Promise<void> {
        this.database = Database.fromConfig(this.config, this.logger);
        await this.database.initialize();
        this.messageHandler = new MessageHandler(this.database, this.logger, this.config);
        await this.messageHandler.loadCommandCalls();
        this.replyHandler = new ReplyHandler(this.messageHandler, this.logger, replyPatterns);
        this.dictionary = new Dictionary(this.database, this.logger);
        this.hangman = new HangmanGame(this.messageHandler, this.dictionary, this.config, this.logger);
        this.pagination = new Pagination(this.messageHandler, this.logger);
        this.llm = new LlmService(this.config.llm, this.logger, this.messageHandler);
    }

    private initializeCommandHandler(loadedCommands: LoadedCommands): void {
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
    }

    private initializeSupportServices(): void {
        this.webhook = new WebhookService(this.logger, this.client, this.config);
        this.emoteInjector = new EmoteInjector(this.webhook, this.messageHandler, this.client);
        this.userHandler = new UserHandler(this.database, this.logger, this.client);
        this.backupHandler = new BackupHandler(this.logger, this.config, this.client);
    }

    private initializeEventServices(): void {
        this.reactionHandler = new ReactionHandler(
            this.database,
            this.commandHandler,
            this.messageHandler,
            this.config,
            this.logger,
            () => this.client.user?.id ?? null,
        );

        this.eventListener = new EventListener(
            this.client,
            this.database,
            this.commandHandler,
            this.emoteInjector,
            this.slashHandler,
            this.backupHandler,
            this.logger,
            this.disallowed,
            this.reactionHandler,
        );
    }

    private async initializeSlashAndReminders(loadedCommands: LoadedCommands): Promise<void> {
        this.slashHandler = new SlashHandler(this.logger, this.client, this);
        await this.slashHandler.registerCommands(loadedCommands.commands);
        this.reminderScheduler = new ReminderScheduler(this.client, this.database, this.logger);
        await this.reminderScheduler.loadPending();
    }

    async initialize(disallowed: Record<string, boolean>): Promise<void> {
        this.disallowed = disallowed;
        await this.initializeCoreServices();
        const loadedCommands = loadCommands(path.resolve(__dirname, ".."), this.logger);
        this.loadedCommands = loadedCommands;
        this.initializeCommandHandler(loadedCommands);
        this.initializeSupportServices();
        await this.initializeSlashAndReminders(loadedCommands);
        this.initializeEventServices();
    }
}
