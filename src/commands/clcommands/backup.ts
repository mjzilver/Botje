import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { IClCommand, IBotContext } from "../../interfaces";

export default {
    name: "backup",
    description: "backs up config, database and emotes into a zip file",
    format: "backup [destination path]",
    async function(input: string[], context: IBotContext) {
        const destination = input[0] ? path.resolve(input[0]) : path.resolve("backups");

        try {
            fs.mkdirSync(destination, { recursive: true });
            fs.accessSync(destination, fs.constants.W_OK);
        } catch {
            context.logger.console(`Cannot write to: ${destination}`);

            return;
        }

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bot-backup-"));
        const backupDir = path.join(tmpDir, "backup");
        fs.mkdirSync(backupDir, { recursive: true });

        try {
            context.logger.console("Starting backup...");
            await context.backupHandler.backupConfig(backupDir);
            await context.backupHandler.backupDatabase(backupDir);
            await context.backupHandler.backupAllEmotes(path.join(backupDir, "emotes"));
            const zipName = `backup-${Date.now()}.zip`;
            const zipPath = path.join(destination, zipName);
            execSync(`cd "${backupDir}" && zip -r "${zipPath}" .`, { stdio: "ignore" });
            context.logger.console(`Backup saved to ${zipPath}`);
        } catch (err) {
            context.logger.error(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    },
} satisfies IClCommand;
