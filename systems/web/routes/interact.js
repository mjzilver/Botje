const express = require('express');
const router = express.Router();

const database = require("systems/database.js")
const bot = require("systems/bot.js")
const webhook = require("systems/webhook.js")

router.get('/', (req, res) => {
    const selectSQL = `SELECT user_id, user_name, COUNT(message)
    FROM messages
    GROUP BY user_id, user_name
    ORDER BY COUNT(message) DESC`

    const channels = Object.fromEntries(bot.client.channels.cache.filter(channel => channel.type === "GUILD_TEXT"))
    const guilds = Object.fromEntries(bot.client.guilds.cache)
    const commands = (require("systems/commandLoader.js").commands)

    database.query(selectSQL, [], async(rows) => {
        rows.unshift({ "user_id": "542721460033028117", "user_name": "Botje" })

        res.render("interact", {
            "guilds": guilds,
            "channels": channels,
            "users": rows,
            "commandNames": commands
        })
    })
});

router.post("/", function(req) {
    webhook.sendMessage(req.body.channel, req.body.text, req.body.user)
})

module.exports = router;
