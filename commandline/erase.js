module.exports = function erase(input) {
    const fs = require('fs')
    fs.truncate('./bot.log', 0, function(err, bytes){ 
        if (err) { 
            global.logger.error(err)
        } 
        global.logger.log('warn', ` === Log was cleared before this === `);
    })
}