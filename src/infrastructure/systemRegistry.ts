import path from "path";
import * as discord from "discord.js";
import type { BotConfig } from "../interfaces/config";
import type { ILogger, IBotContext } from "../interfaces";
import { Database } from "./database";
import { MessageHandler } from "../handlers/messageHandler";
import { CommandHandler } from "../handlers/commandHandler";
import { EventListener } from "../handlers/eventListener";
import { ReplyHandler } from "../handlers/replyHandler";
import { SlashHandler } from "../handlers/slashHandler";
import { UserHandler } from "../handlers/userHandler";
import { EmoteInjector } from "../features/emoji/emoteInjector";
import { WebhookService } from "../services/webhook";
import { BackupHandler } from "../features/backup/backupHandler";
import { Dictionary } from "../features/nlp/dictionary";
import { HangmanGame } from "../features/hangman/hangman";
import { Pagination } from "../utils/support/pagination";
import { loadCommands, type LoadedCommands } from "../handlers/commandLoader";
import { LlmService } from "../services/llm";
import { ReactionHandler } from "../handlers/reactionHandler";
import { Settings } from "./settings";
import { ReminderScheduler } from "../features/reminders/reminderScheduler";
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

    async initialize(disallowed: Record<string, boolean>): Promise<void> {
        this.disallowed = disallowed;
        this.database = Database.fromConfig(this.config, this.logger);
        await this.database.initialize();
        this.messageHandler = new MessageHandler(this.database, this.logger, this.config);
        await this.messageHandler.loadCommandCalls();
        this.replyHandler = new ReplyHandler(this.messageHandler, this.logger, replyPatterns);
        this.dictionary = new Dictionary(this.database, this.logger);
        this.hangman = new HangmanGame(this.messageHandler, this.dictionary, this.config, this.logger);
        this.pagination = new Pagination(this.messageHandler, this.logger);
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
        this.reactionHandler = new ReactionHandler(
            this.database,
            this.commandHandler,
            this.messageHandler,
            this.config,
            this.logger,
            () => this.client.user?.id,
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
        this.reminderScheduler = new ReminderScheduler(this.client, this.database, this.logger);
        await this.reminderScheduler.loadPending();
    }
}
