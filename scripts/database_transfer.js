const sqlitedb = require("systems/databases/sqlite.js")
const postgresdb = require("systems/databases/postgres.js")
const logger = require("systems/logger")

let selectSQL = "SELECT * FROM messages"
sqlitedb.db.all(selectSQL, [], (err, rows) => {
    if (err)
        throw err
    for (let i = 0; i < rows.length; i++) {
        let message = rows[i]
        try {
            let set_user_id = isNaN(parseInt(message["user_id"])) ? 0 : parseInt(message["user_id"])
            let set_channel_id = isNaN(parseInt(message["channel"])) ? 0 : parseInt(message["channel"])
            let set_server_id = isNaN(parseInt(message["server"])) ? 0 : parseInt(message["server"])
            let set_date = isNaN(parseInt(message["date"])) ? 0 : parseInt(message["date"])
                
            let set_id = parseInt(message["id"] ? message["id"] : i)

            postgresdb.client.query(
                "INSERT INTO messages (id, user_id, user_name, message, channel_id, server_id, datetime) VALUES ($1, $2, $3, $4, $5, $6, $7) ON CONFLICT (id) DO NOTHING",
                [set_id, set_user_id, message["user_name"], message["message"], set_channel_id, set_server_id, set_date]
            )   
        } catch (err) {
            logger.error(`Failed to insert: ${message["message"]}`)
            logger.error(err)
        }
    }
})
