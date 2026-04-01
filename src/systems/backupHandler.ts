import * as discord from "discord.js";
import { spawn } from "child_process";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import axios from "axios";
import type { ILogger } from "../interfaces";
import type { BotConfig } from "../interfaces/config";
import { sanitizeFilename } from "./stringHelpers";

interface BotEmoji {
    id: string;
    name: string | null;
}

export class BackupHandler {
    private logger: ILogger;
    private config: BotConfig;
    private client: discord.Client;
    constructor(logger: ILogger, config: BotConfig, client: discord.Client) {
        this.logger = logger;
        this.config = config;
        this.client = client;
    }

    async backupAllEmotes(destination: string | null = null): Promise<void> {
        this.logger.console("Saving all emotes...");
        const client = this.client;
        const tasks: Promise<string>[] = [];
        for (const [, guild] of client.guilds.cache)
            for (const [, emoji] of guild.emojis.cache) tasks.push(this.saveEmoji(emoji, guild.name, "", destination));
        await Promise.all(tasks);
        this.logger.console("All emotes saved successfully");
    }

    saveEmoji(
        emoji: BotEmoji,
        guildName: string,
        filenameExtra = "",
        destination: string | null = null,
    ): Promise<string> {
        return new Promise((resolve, reject) => {
            const basePath = destination ?? path.join("backups", "emotes");
            const guildPath = path.join(basePath, sanitizeFilename(guildName));
            const emojiLink = `https://cdn.discordapp.com/emojis/${emoji.id}.png`;
            const emojiPath = path.join(guildPath, `${emoji.name}${filenameExtra}.png`);
            fs.mkdirSync(guildPath, { recursive: true });
            if (fs.existsSync(emojiPath) && fs.statSync(emojiPath).size >= 10) return resolve(emojiPath);
            this.logger.console(`Saving ${emoji.name} at ${emojiPath}`);
            axios
                .get(emojiLink, { responseType: "stream" })
                .then((response) =>
                    pipeline(response.data as NodeJS.ReadableStream, fs.createWriteStream(emojiPath, { flags: "w" })),
                )
                .then(() => resolve(emojiPath))
                .catch(reject);
        });
    }

    backupConfig(destination: string | null = null): Promise<void> {
        return new Promise((resolve, reject) => {
            const basePath = destination ?? "backups/config";
            try {
                fs.mkdirSync(basePath, { recursive: true });
                fs.copyFileSync("config.json", path.join(basePath, "config.json"));
                this.logger.console(`Config backed up to ${basePath}`);
                resolve();
            } catch (err) {
                reject(err);
            }
        });
    }

    backupDatabase(destination: string | null = null): Promise<void> {
        return new Promise((resolve, reject) => {
            const timestamp = Date.now();
            const basePath = destination ?? "backups/database";
            try {
                fs.mkdirSync(basePath, { recursive: true });
            } catch (err) {
                return reject(err);
            }

            const dbPath = path.join(basePath, `backup-${timestamp}.sql`);
            const writeStream = fs.createWriteStream(dbPath, { flags: "w" });
            writeStream.on("error", reject);
            const { user, password, host, port, database } = this.config.db;
            const connStr = `postgresql://${encodeURIComponent(user)}:${encodeURIComponent(password)}@${host}:${port}/${encodeURIComponent(database)}`;
            const dump = spawn("pg_dump", ["--format=p", "--no-owner", "--no-acl", connStr]);
            dump.on("error", (err) => {
                writeStream.destroy();
                reject(err);
            });
            dump.stderr.on("data", (chunk: Buffer) => {
                this.logger.error(`pg_dump stderr: ${chunk.toString()}`);
            });
            dump.stdout.pipe(writeStream);
            dump.on("close", (code) => {
                if (code === 0) {
                    this.logger.console(`Database backed up to ${dbPath}`);
                    resolve();
                } else {
                    reject(new Error(`pg_dump exited with code ${code}`));
                }
            });
        });
    }
}
