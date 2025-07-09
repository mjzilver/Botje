const fs = require("fs")

const logger = require("../../systems/logger")

module.exports = {
    "name": "erase",
    "description": "erases the log",
    "format": "erase",
    "function": function erase() {
        fs.truncate("bot.log", 0, (err) => {
            if (err)
                logger.error(err)
            logger.warn(" === Log was cleared before this === ")
        })
    }
}