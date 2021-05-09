module.exports = function dbinfo(input) {
    console.log('===== Database information =====')
    let selectSQL = 'SELECT COUNT(*) as count FROM messages'

    database.db.get(selectSQL, [], (err, row) => {
        if (err)
            console.log('Error in database: ' + err)
        else
            console.log(`There are ${row['count']} messages in the database`)

        console.log('================================')
    })
}