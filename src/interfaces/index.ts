import type { BotMessage, GuildBotMessage, MessageContent } from "./discord";
import type { SlashCommandBuilder } from "discord.js";
import type { QueryResultRow } from "pg";
import type { BotConfig } from "./config";
import type { LoadedCommands } from "../systems/commandLoader";

export type SqlParam = string | number | boolean | null | Date | Buffer;

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

export interface IMessageHandler {
    send(call: BotMessage, content: MessageContent): Promise<BotMessage | undefined>;
    reply(call: BotMessage, content: MessageContent): Promise<BotMessage | undefined>;
    edit(replyObj: BotMessage, newContent: MessageContent): Promise<BotMessage>;
    delete(message: BotMessage): Promise<void>;
    react(message: BotMessage, emoji: string): Promise<void>;
    addCommandCall(call: BotMessage, reply: BotMessage): void;
    markComplete(call: BotMessage): void;
    findFromReply(replyMessage: BotMessage): string | undefined;
}

export interface IDatabase {
    query<T extends QueryResultRow = QueryResultRow>(sql: string, params?: SqlParam[]): Promise<T[]>;
    insert(sql: string, params?: SqlParam[]): Promise<void>;
    getCount(selectQuery: string, parameters?: SqlParam[]): Promise<number>;
    queryRandomMessage<T extends QueryResultRow = QueryResultRow>(
        selectQuery: string,
        parameters?: SqlParam[],
    ): Promise<T[]>;
    ensureUserExists(user: { id: string }, serverId: string | null, displayName?: string | null): Promise<void>;
    storeMessage(message: BotMessage): Promise<void>;
    updateMessage(message: BotMessage): Promise<void>;
    insertMessage(message: GuildBotMessage): Promise<void>;
    insertReaction(reaction: import("./discord").BotReaction): Promise<void>;
    getCurrentUsername(userId: string, serverId: string): Promise<string | null>;
}

export interface LogEntry {
    level: string;
    message: string;
    timestamp: string;
}

export interface ILogger {
    error(msg: string | Error): void;
    warn(msg: string): void;
    info(msg: string): void;
    debug(msg: string): void;
    startup(msg: string): void;
    console(msg: string): void;
    repeat(msg: string): void;
    printColumns(arrays: string[][], headers?: string[]): void;
    printRows(rows: Array<[string, string | number]>, logFn?: (msg: string) => void): void;
}

export interface IHttpClient {
    get<T>(
        url: string,
        options?: Record<string, string>,
    ): Promise<{ data: T; headers: Record<string, string>; status: number }>;
    post<T>(
        url: string,
        body: Record<string, SqlParam>,
        options?: Record<string, string>,
    ): Promise<{ data: T; status: number }>;
    stream(
        url: string,
        body: Record<string, SqlParam>,
        options?: Record<string, string>,
    ): Promise<NodeJS.ReadableStream>;
}

export interface IUserHandler {
    getDisplayName(userId: string, serverId: string): Promise<string>;
}

export interface IPagination {
    createPages<T>(
        items: T[],
        itemsPerPage: number,
        formatPage: (items: T[], pageNum: number, totalPages: number) => Promise<MessageContent> | MessageContent,
    ): Promise<MessageContent[]>;
    sendPaginatedEmbed(message: BotMessage, pages: MessageContent[], timeout?: number): Promise<BotMessage | undefined>;
}

export interface IBackupHandler {
    backupAllEmotes(destination?: string | null): Promise<void>;
    backupConfig(destination?: string | null): Promise<void>;
    backupDatabase(destination?: string | null): Promise<void>;
}

export interface IHangman {
    run(message: BotMessage): void;
}

export interface ILlmService {
    streamToMessage(
        message: BotMessage,
        prompt: string,
        filterFn?: ((text: string) => string) | null,
    ): Promise<string | undefined>;
}

export interface IDictionary {
    getNonSelectorsRegex(): RegExp;
}

interface IClientChannelMessage {
    id: string;
    author?: { id: string; bot?: boolean };
    content?: string;
    delete(): Promise<unknown>;
}

interface IClientChannel {
    type: number;
    name?: string | null;
    lastMessageId?: string | null;
    messages?: {
        fetch(options: { limit: number; before: string }): Promise<Map<string, IClientChannelMessage>>;
    };
    guild?: { name?: string | null };
}

export interface IBotClient {
    user: { id: string } | null;
    readyTimestamp: number | null;
    channels: { cache: Map<string, IClientChannel> };
    destroy(): void;
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
    client: IBotClient;
    disallowed: Record<string, boolean>;
}
