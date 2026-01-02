const { execSync } = require("child_process")
const fs = require("fs")
const os = require("os")
const path = require("path")

const bot = require("../../systems/bot")
const logger = require("../../systems/logger")

function getUsbMounts() {
    const output = execSync(
        "findmnt -rn -o TARGET | grep '^/media/'",
        { encoding: "utf8" }
    )

    return output.trim().split("\n").filter(Boolean)
}

function isValidDirectory(dir) {
    try {
        return (
            fs.existsSync(dir)
            && fs.statSync(dir).isDirectory()
            && fs.accessSync(dir, fs.constants.W_OK) === undefined
        )
    } catch {
        return false
    }
}

module.exports = {
    name: "backup",
    description: "Backs up everything to a drive",
    format: "backup <destination>",
    function: async function backup(input) {
        if (!input[0]) {
            logger.console("Available mount points:")
            getUsbMounts().forEach(m => logger.console(`- ${m}`))
            return
        }

        const destination = path.resolve(input[0])

        if (!isValidDirectory(destination)) {
            logger.console(`Invalid or unwritable directory: ${destination}`)
            return
        }

        const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "bot-backup-"))
        const backupDir = path.join(tmpDir, "backup")

        fs.mkdirSync(backupDir, { recursive: true })

        try {
            logger.console("Starting backup...")

            await bot.backupHandler.backupConfig(backupDir)
            await bot.backupHandler.backupDatabase(backupDir)
            await bot.backupHandler.backupAllEmotes(path.join(backupDir, "emotes"))

            const timestamp = Date.now()
            const zipName = `backup-${timestamp}.zip`
            const zipPath = path.join(tmpDir, zipName)

            execSync(
                `cd "${backupDir}" && zip -r "${zipPath}" .`,
                { stdio: "ignore" }
            )

            fs.copyFileSync(zipPath, path.join(destination, zipName))

            logger.console(`Backup completed successfully: ${destination}/${zipName}`)
        } catch (err) {
            logger.error("Backup failed:", err)
        } finally {
            fs.rmSync(tmpDir, { recursive: true, force: true })
        }
    }
}
