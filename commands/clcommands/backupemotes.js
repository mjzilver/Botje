const bot = require("../../systems/bot")

module.exports = {
    name: "backupemotes",
    description: "Saves all emotes to backups/emotes/<guildId>",
    format: "backupemotes",
    function:() => {
        bot.backupHandler.backupAllEmotes()
    }
}
