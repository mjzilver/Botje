const { spawn } = require("child_process")
const fs = require("fs")
const path = require("path")
const { pipeline } = require("stream/promises")

const axios = require("axios")

const logger = require("./logger")
const { config } = require("./settings")

module.exports = class BackupHandler {
    constructor(bot) {
        this.bot = bot
    }

    async backupAllEmotes(destination = null) {
        logger.console("Saving all emotes...")

        const tasks = []

        for (const [, guild] of this.bot.client.guilds.cache)
            for (const [, emoji] of guild.emojis.cache)
                tasks.push(
                    this.saveEmoji(emoji, guild.name, "", destination)
                )

        await Promise.all(tasks)

        logger.console("All emotes saved successfully")
    }

    async saveEmoji(emoji, guildName, filename = "", destination = null) {
        return new Promise((resolve, reject) => {
            const basePath = destination
                ? destination
                : path.join("backups", "emotes")

            const guildPath = path.join(basePath, guildName.sanitizeFilename())
            const emojiLink = `https://cdn.discordapp.com/emojis/${emoji.id}.png`
            const emojiPath = path.join(
                guildPath,
                `${emoji.name}${filename}.png`
            )

            fs.mkdirSync(guildPath, { recursive: true })

            if (fs.existsSync(emojiPath) && fs.statSync(emojiPath).size >= 10)
                return resolve(emojiPath)

            logger.console(`Saving ${emoji.name} at ${emojiPath} from ${emojiLink}`)

            axios.get(emojiLink, { responseType: "stream" })
                .then(response => pipeline(response.data, fs.createWriteStream(emojiPath, { flags: "w" })))
                .then(() => resolve(emojiPath))
                .catch(reject)
        })
    }

    async backupConfig(destination = null) {
        const basePath = destination || "backups/config"

        return new Promise((resolve, reject) => {
            try {
                fs.mkdirSync(basePath, { recursive: true })
                fs.copyFileSync("config.json", path.join(basePath, "config.json"))
                logger.console(`Config backed up to ${basePath}`)
                resolve()
            } catch (err) {
                reject(err)
            }
        })
    }

    async backupDatabase(destination = null) {
        return new Promise((resolve, reject) => {
            const timeStamp = Date.now()
            const basePath = destination || "backups/database"

            try {
                fs.mkdirSync(basePath, { recursive: true })
            } catch (err) {
                return reject(err)
            }

            const dbBackupPath = path.join(basePath, `backup-${timeStamp}.sql`)
            const writeStream = fs.createWriteStream(dbBackupPath, { flags: "w" })
            writeStream.on("error", err => reject(err))

            const connStr = `postgresql://${encodeURIComponent(config.db.user)}:${encodeURIComponent(config.db.password)}@${config.db.host}:${config.db.port}/${encodeURIComponent(config.db.database)}`

            const dump = spawn("pg_dump", ["--format=p", "--no-owner", "--no-acl", connStr])

            dump.on("error", err => {
                writeStream.destroy()
                reject(err)
            })

            dump.stderr.on("data", chunk => {
                logger.error(`pg_dump stderr: ${chunk.toString()}`)
            })

            dump.stdout.pipe(writeStream)

            dump.on("close", code => {
                if (code !== 0)
                    return reject(new Error(`pg_dump exited with code ${code}`))

                writeStream.end(() => {
                    logger.console(`Database exported successfully to ${dbBackupPath}`)
                    resolve(dbBackupPath)
                })
            })
        })
    }
}
