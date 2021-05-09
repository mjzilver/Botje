module.exports = function vacuum(input) {
    console.log('===== Database being vacuumed =====')

    database.db.run('VACUUM', [], (err) => {
        if (err)
            return console.error(err.message)
        console.log(`Vacuuming completed`)
    })
}