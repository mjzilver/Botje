import type { BotMessage } from "./discord";
import type { Client, SlashCommandBuilder } from "discord.js";
import type { BotConfig } from "./config";
import type { LoadedCommands } from "../systems/commandLoader";
import type { SqlParam, IDatabase } from "../systems/database";
import type { IMessageHandler } from "../systems/messageHandler";
import type { LogEntry, ILogger } from "../systems/logger";
import type { IUserHandler } from "../systems/userHandler";
import type { IPagination } from "../systems/pagination";
import type { IBackupHandler } from "../systems/backupHandler";
import type { IHangman } from "../systems/hangman";
import type { ILlmService } from "../systems/llm";
import type { IDictionary } from "../systems/dictionary";

export type { SqlParam, IDatabase };

export type { IMessageHandler };

export type { LogEntry, ILogger };

export type { IUserHandler };

export type { IPagination };

export type { IBackupHandler };

export type { IHangman };

export type { ILlmService };

export type { IDictionary };

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
}
