const bot = require("../bot")

module.exports = function shutdown(input) {
    global.logger.log('warn', ` --- Shutting down the bot --- `);

    global.bot.bot.destroy();
}