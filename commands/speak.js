module.exports = function speak(message) {    
    let selectSQL = `SELECT message FROM messages
    WHERE server = ?
    AND message NOT LIKE "%<%" AND message NOT LIKE "%:%" 
    ORDER BY RANDOM()
    LIMIT 1 `;

    database.db.get(selectSQL, [message.guild.id], (err, row) => {
        if (err)
            throw err;
        else 
            message.channel.send(row['message'].capitalize().normalizeSpaces());
    })
}
