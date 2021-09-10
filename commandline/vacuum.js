module.exports = function vacuum(input) {
    logger.console('===== Database being vacuumed =====')

    database.db.run('VACUUM', [], (err) => {
        if (err)
            return console.error(err.message)
        logger.console(`Vacuuming completed`)
    })
}