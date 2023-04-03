let fs = require('fs')

module.exports = {
    'name': 'erase',
    'description': 'erases the log',
    'format': 'erase',
    'function': function erase(input) {
        fs.truncate('./bot.log', 0, function (err, bytes) {
            if (err)
                logger.error(err)
            logger.warn(` === Log was cleared before this === `)
        })
    }
}