import type { BotMessage } from "./discord";
import type { Client, SlashCommandBuilder } from "discord.js";
import type { BotConfig } from "./config";
import type { LoadedCommands } from "../handlers/commandLoader";
import type { SqlParam, IDatabase, ReminderRow } from "../infrastructure/database";
import type { IMessageHandler } from "../handlers/messageHandler";
import type { LogEntry, ILogger } from "../infrastructure/logger";
import type { IUserHandler } from "../handlers/userHandler";
import type { IPagination } from "../utils/support/pagination";
import type { IBackupHandler } from "../features/backup/backupHandler";
import type { IHangman } from "../features/hangman/hangman";
import type { ILlmService } from "../services/llm";
import type { IDictionary } from "../features/nlp/dictionary";
import type { Settings } from "../infrastructure/settings";
import type { ReminderScheduler } from "../features/reminders/reminderScheduler";

export type { SqlParam, IDatabase, ReminderRow };

export type { IMessageHandler };

export type { LogEntry, ILogger };

export type { IUserHandler };

export type { IPagination };

export type { IBackupHandler };

export type { IHangman };

export type { ILlmService };

export type { IDictionary };

export interface IWebhookService {
    sendMessage(channelId: string, text: string, userId: string): Promise<boolean>;
}

export interface CommandOption {
    type: "user" | "string" | "integer";
    name: string;
    description: string;
    required?: boolean;
    choices?: Array<{ name: string; value: string }>;
}

export interface SubCommand {
    name: string;
    description: string;
    options?: CommandOption[];
}

export interface ICommand {
    name: string;
    description: string;
    format: string;
    disabled?: boolean;
    aliases?: string;
    function(message: BotMessage, context: IBotContext): void | Promise<void | BotMessage | undefined>;
    slashCommand?: SlashCommandBuilder;
    options?: CommandOption[];
    subcommands?: SubCommand[];
}

export interface IClCommand {
    name: string;
    description: string;
    format: string;
    disabled?: boolean;
    aliases?: string;
    function(input: string[], context: IBotContext): void | Promise<void>;
    completer?(argIndex: number, context: IBotContext, input: string[]): string[];
}

export interface IBotContext {
    database: IDatabase;
    messageHandler: IMessageHandler;
    logger: ILogger;
    config: BotConfig;
    userHandler: IUserHandler;
    pagination: IPagination;
    backupHandler: IBackupHandler;
    hangman: IHangman;
    llm: ILlmService;
    loadedCommands: LoadedCommands;
    dictionary: IDictionary;
    client: Client;
    disallowed: Record<string, boolean>;
    settings: Settings;
    reminderScheduler: ReminderScheduler;
    webhook: IWebhookService;
}
