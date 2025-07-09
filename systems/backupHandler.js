const fs = require("fs")
const request = require("request")
const logger = require("systems/logger.js")
const database = require("systems/database.js")
const format = require("pg-format")

module.exports = class BackupHandler {
    constructor(bot) {
        this.bot = bot
    }

    saveEmoji(emoji, filename = "") {
        const guildpath = `backups/emotes/${emoji.guild.id}`
        const emojilink = `https://cdn.discordapp.com/emojis/${emoji.id}.png`
        const emojipath = `${guildpath}/${emoji.name}${filename}.png`

        if (!fs.existsSync(emojipath) || fs.statSync(emojipath).size < 10) {
            logger.console(`Saving ${emoji.name} at ${emojipath} from ${emojilink}`)

            request(emojilink).pipe(fs.createWriteStream(emojipath, { flags: "w" })).on("error", (err) => {
                logger.error(`Failed to save emoji "${emoji.name}" for guild "${emoji.guild.id}" at path "${emojipath}":`, err)
            })
        }
    }

    exportDatabase() {
        const timeStamp = new Date().getTime()
        const dbBackupPath = `backups/database/backup-${timeStamp}.sql`
        const writeStream = fs.createWriteStream(dbBackupPath, { flags: "a" })

        writeStream.write("BEGIN;\n")

        const selectSQL = "SELECT * FROM messages;"

        database.query(selectSQL, [], (rows) => {
            for (const row of rows) {
                const insertStatement = format(`INSERT INTO messages 
                    (id, user_id, user_name, message, channel_id, server_id, datetime) 
                    VALUES (%L, %L, %L, %L, %L, %L, %L) 
                    ON CONFLICT (id) DO NOTHING;`,
                row.id, row.user_id, row.user_name, row.message,
                row.channel_id, row.server_id, row.datetime)

                writeStream.write(`${insertStatement}\n`)
            }

            writeStream.write("COMMIT;\n")
            writeStream.end(() => {
                logger.console(`Database exported successfully to ${dbBackupPath}`)
            })

            writeStream.on("error", (writeErr) => {
                logger.error("Failed to write database backup file:", writeErr)
            })
        })
    }
}
