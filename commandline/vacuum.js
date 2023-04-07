let database = require('../systems/database.js')

module.exports = {
    'name': 'vacuum',
    'description': 'removes leftover data from the database',
    'format': 'vacuum',
    'function': function vacuum(input) {
        logger.console('===== Database being vacuumed =====')

        database.db.run('VACUUM', [], (err) => {
            if (err)
                return console.error(err.message)
            logger.console(`Vacuuming completed`)
        })
    }
}