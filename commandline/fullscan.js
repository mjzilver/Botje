const save = require("./save");

module.exports = function fullscan(input) {
    for (const [channelID, channel] of bot.bot.channels.cache.entries())
        if (channel.type == "text")
            save([channelID])
}