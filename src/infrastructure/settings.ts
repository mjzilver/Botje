import fs from "node:fs";
import path from "node:path";
import type { ILogger } from "../interfaces";
import type { BotConfig, DbConfig, LlmConfig } from "../interfaces/config";
import { toError } from "../utils";

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), "config.json");

type PartialDbConfig = Partial<DbConfig>;
type PartialLlmConfig = Partial<LlmConfig>;
type PartialBotConfig = Partial<BotConfig> & {
    db?: PartialDbConfig;
    llm?: PartialLlmConfig;
};

function requireString(value: string | undefined, key: string): string {
    if (typeof value !== "string" || value.length === 0) {
        throw new Error(`Invalid config: '${key}' must be a non-empty string`);
    }

    return value;
}

function requireNumber(value: number | undefined, key: string): number {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        throw new Error(`Invalid config: '${key}' must be a finite number`);
    }

    return value;
}

function requireBoolean(value: boolean | undefined, key: string): boolean {
    if (typeof value !== "boolean") {
        throw new Error(`Invalid config: '${key}' must be a boolean`);
    }

    return value;
}

function requireColorHex(value: string | undefined, key: string): `#${string}` {
    const colorHex = requireString(value, key);
    if (!/^#[0-9a-fA-F]{6}$/.test(colorHex)) {
        throw new Error("Invalid config: 'colorHex' must be in #RRGGBB format");
    }

    return colorHex as `#${string}`;
}

function validateDbConfig(db: PartialDbConfig | undefined): DbConfig {
    if (!db) {
        throw new Error("Invalid config: 'db' is required");
    }

    return {
        user: requireString(db.user, "db.user"),
        host: requireString(db.host, "db.host"),
        database: requireString(db.database, "db.database"),
        password: requireString(db.password, "db.password"),
        port: requireNumber(db.port, "db.port"),
        poolSize: requireNumber(db.poolSize, "db.poolSize"),
    };
}

function validateLlmConfig(llm: PartialLlmConfig | undefined): LlmConfig {
    if (!llm) {
        throw new Error("Invalid config: 'llm' is required");
    }

    return {
        model: requireString(llm.model, "llm.model"),
        api: requireString(llm.api, "llm.api"),
        basePrompt: requireString(llm.basePrompt, "llm.basePrompt"),
        conversationPrompt: requireString(llm.conversationPrompt, "llm.conversationPrompt"),
        tarotPrompt: requireString(llm.tarotPrompt, "llm.tarotPrompt"),
        maxConcurrentRequests: requireNumber(llm.maxConcurrentRequests, "llm.maxConcurrentRequests"),
    };
}

function validateConfig(config: PartialBotConfig): BotConfig {
    const colorHex = requireColorHex(config.colorHex, "colorHex");

    return {
        prefix: requireString(config.prefix, "prefix"),
        botName: requireString(config.botName, "botName"),
        discordApiKey: requireString(config.discordApiKey, "discordApiKey"),
        discordApiKeyBeta: requireString(config.discordApiKeyBeta, "discordApiKeyBeta"),
        weatherApiKey: requireString(config.weatherApiKey, "weatherApiKey"),
        youtubeApiKey: requireString(config.youtubeApiKey, "youtubeApiKey"),
        owner: requireString(config.owner, "owner"),
        speakEvery: requireNumber(config.speakEvery, "speakEvery"),
        speakMinTimeoutMinutes: requireNumber(config.speakMinTimeoutMinutes, "speakMinTimeoutMinutes"),
        speakMaxTimeoutMinutes: requireNumber(config.speakMaxTimeoutMinutes, "speakMaxTimeoutMinutes"),
        speakRandomChance: requireNumber(config.speakRandomChance, "speakRandomChance"),
        downvoteThreshold: requireNumber(config.downvoteThreshold, "downvoteThreshold"),
        timeoutDuration: requireNumber(config.timeoutDuration, "timeoutDuration"),
        colorHex,
        positiveEmoji: requireString(config.positiveEmoji, "positiveEmoji"),
        negativeEmoji: requireString(config.negativeEmoji, "negativeEmoji"),
        redoEmoji: requireString(config.redoEmoji, "redoEmoji"),
        db: validateDbConfig(config.db),
        llm: validateLlmConfig(config.llm),
        shouldScanOnStartup: requireBoolean(config.shouldScanOnStartup, "shouldScanOnStartup"),
    };
}

export class Settings {
    private data: BotConfig;
    private configPath: string;
    private logger: Pick<ILogger, "error">;
    constructor(logger: Pick<ILogger, "error">, configPath = DEFAULT_CONFIG_PATH) {
        this.logger = logger;
        this.configPath = configPath;
        this.data = this.loadFromFile(configPath);
    }

    private loadFromFile(filePath: string): BotConfig {
        try {
            const data = fs.readFileSync(filePath, "utf8");
            const parsed = JSON.parse(data) as PartialBotConfig;

            return validateConfig(parsed);
        } catch (err) {
            this.logger.error(`Error loading config file: ${toError(err).message}`);
            throw new Error(`Invalid config file at ${filePath}: ${toError(err).message}`);
        }
    }

    get config(): BotConfig {
        return this.data;
    }

    set config(value: BotConfig) {
        this.data = value;
        this.saveToFile();
    }

    updateVariable(key: string, value: BotConfig[keyof BotConfig]): void {
        Object.assign(this.data, { [key]: value });
        this.saveToFile();
    }

    private saveToFile(): void {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this.data, null, 2), "utf8");
        } catch (err) {
            this.logger.error(`Error saving config file: ${toError(err).message}`);
        }
    }
}
