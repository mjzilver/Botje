import fs from "fs";
import path from "path";
import type { BotConfig } from "../interfaces/config";
import type { ILogger } from "../interfaces";
const DEFAULT_CONFIG_PATH = path.resolve(process.cwd(), "config.json");
export class Settings {
    private _config: BotConfig;
    private configPath: string;
    private logger: Pick<ILogger, "error">;
    constructor(logger: Pick<ILogger, "error">, configPath = DEFAULT_CONFIG_PATH) {
        this.logger = logger;
        this.configPath = configPath;
        this._config = this.loadFromFile(configPath);
    }
    private loadFromFile(filePath: string): BotConfig {
        try {
            const data = fs.readFileSync(filePath, "utf8");
            return JSON.parse(data) as BotConfig;
        } catch (err) {
            this.logger.error(`Error loading config file: ${err}`);
            return {} as BotConfig;
        }
    }
    get config(): BotConfig {
        return this._config;
    }
    updateVariable(key: string, value: string | number | boolean): void {
        Reflect.set(this._config, key, value);
        this.saveToFile();
    }
    private saveToFile(): void {
        try {
            fs.writeFileSync(this.configPath, JSON.stringify(this._config, null, 2), "utf8");
        } catch (err) {
            this.logger.error(`Error saving config file: ${err}`);
        }
    }
}
