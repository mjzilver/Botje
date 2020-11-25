module.exports = function clear(input) {
    console.log('===== Database information =====')
    const db = global.database.db;
    let selectSQL = 'SELECT COUNT(*) as count FROM messages';

    db.get(selectSQL, [], (err, row) => {
        if (err) {
            console.log('Error in database: ' + err);
        } else {
            console.log(`There are ${row['count']} messages in the database`)
        }
        console.log('================================')
    })
}