import fs from "fs";
import path from "path";
import type { BotConfig } from "../interfaces/config";
import type { ILogger } from "../interfaces";
import { toError } from "../utils";

const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), "config.json");

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

            return JSON.parse(data) as BotConfig;
        } catch (err) {
            this.logger.error(`Error loading config file: ${toError(err).message}`);

            return {} as BotConfig;
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
