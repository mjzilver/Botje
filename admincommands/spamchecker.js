let fs = require('fs')

module.exports = async function spamchecker(message) {
    path = "./config.json"

    if (config.spamchecker == 1) {
        config.spamchecker = 0
        bot.message.reply(message, `Spamchecker is now off`)
    } else {
        config.spamchecker = 1
        bot.message.reply(message, `Spamchecker is now on`)
    }

    fs.writeFile(path, JSON.stringify(config, null, 4), function (err) {
        if (err)
            logger.error(err)
    })
}

