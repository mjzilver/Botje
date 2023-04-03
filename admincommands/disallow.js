let fs = require('fs')

module.exports = function disallow(message) {
    const mention = message.mentions.users.first()
    const args = message.content.split(' ')

    var filepath = './json/disallowed.json'
    var disallowed = JSON.parse(fs.readFileSync(filepath))

    if (args[2] && args[2] == "remove") {
        delete disallowed[mention.id]
        logger.warn(`${mention.username} is now allowed to use the bot again`)
        bot.message.markComplete(message)
    } else if (mention) {
        disallowed[mention.id] = true
        logger.warn(`${mention.username} is no longer allowed to use the bot`)
        bot.message.markComplete(message)
    } else {
        return bot.message.send(message, 'You need to @ someone to disallow them')
    }

    fs.writeFile(filepath, JSON.stringify(disallowed), function (err) {
        if (err)
            logger.error(err)
    })
}