module.exports = function dbinfo(input) {
    logger.console('===== Database information =====')
    let selectSQL = 'SELECT COUNT(*) as count FROM messages'

    database.db.get(selectSQL, [], (err, row) => {
        if (err)
            logger.console('Error in database: ' + err)
        else
            logger.console(`There are ${row['count']} messages in the database`)
    })
}