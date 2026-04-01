import { execSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import type { IClCommand, IBotContext } from "../../interfaces";

function getUsbMounts(): string[] {
    const output = execSync("findmnt -rn -o TARGET | grep '^/media/'", { encoding: "utf8" });

    return output.trim().split("\n").filter(Boolean);
}

function isValidDirectory(dir: string): boolean {
    try {
        return (
            fs.existsSync(dir) && fs.statSync(dir).isDirectory() && fs.accessSync(dir, fs.constants.W_OK) === undefined
        );
    } catch {
        return false;
    }
}

export default {
    name: "backup",
    description: "Backs up everything to a drive",
    format: "backup <destination>",
    async function(input: string[], context: IBotContext) {
        if (!input[0]) {
            context.logger.console("Available mount points:");
            getUsbMounts().forEach((m) => context.logger.console(`- ${m}`));

            return;
        }

        const destination = path.resolve(input[0]);
        if (!isValidDirectory(destination)) {
            context.logger.console(`Invalid or unwritable directory: ${destination}`);

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
            const timestamp = Date.now();
            const zipName = `backup-${timestamp}.zip`;
            const zipPath = path.join(tmpDir, zipName);
            execSync(`cd "${backupDir}" && zip -r "${zipPath}" .`, { stdio: "ignore" });
            fs.copyFileSync(zipPath, path.join(destination, zipName));
            context.logger.console(`Backup completed successfully: ${destination}/${zipName}`);
        } catch (err) {
            context.logger.error(`Backup failed: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true });
        }
    },
} satisfies IClCommand;
