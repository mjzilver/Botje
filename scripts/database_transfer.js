/* eslint-disable */
const sqlitedb = require("scripts/sqlitedb.js")
const postgresdb = require("systems/database.js")
const logger = require("systems/logger")

const selectSQL = "SELECT * FROM messages order by id DESC"
sqlitedb.db.all(selectSQL, [], (err, rows) => {
    if (err)
    {throw err}

    var i = 0
    rows.forEach(message => {
        try {
            i++
            const set_user_id = isNaN(parseInt(message["user_id"])) ? 0 : (message["user_id"])
            const set_channel_id = isNaN(parseInt(message["channel"])) ? 0 : (message["channel"])
            const set_server_id = isNaN(parseInt(message["server"])) ? 0 : (message["server"])
            const set_date = isNaN(parseInt(message["date"])) ? 0 : (message["date"].slice(0, -2))
            const set_id = isNaN(parseInt(message["id"])) ? i : message["id"]

            postgresdb.client.query(
                "INSERT INTO messages (id, user_id, user_name, message, channel_id, server_id, datetime) VALUES ($1::bigint, $2::bigint, $3, $4, $5::bigint, $6::bigint, $7::bigint) ON CONFLICT (id) DO NOTHING",
                [set_id, set_user_id, message["user_name"], message["message"], set_channel_id, set_server_id, set_date]
            )
        } catch (err) {
            logger.error(`Failed to insert: ${message["message"]}`)
            logger.error(err)
        }
    })
})
