module.exports = function speak(message, findWord = 1) {
    let selectSQL = `SELECT message FROM messages
    WHERE server = ?
    AND message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" 
    ORDER BY RANDOM()
    LIMIT 1 `;

    if (findWord) {
        message.content = message.content.replace(new RegExp(/(\b|^| )(bot(je)?|:.+:|<.+>)( *|$)/, "gi"), '');
        message.contet = message.content.textOnly();
        const words = message.content.split(' ');
        if (words[0] == 'speak')
            words.shift();

        if (words && words.length >= 1 && words[0]) {
            if (words.length > 1) {
                words.sort(function (a, b) { return b.length - a.length; });
                if (randomBetween(0, 1))
                    words.sort(function (a, b) {
                        let al = a.match(/(?:[aeiouy]{1,2})/gi);
                        let bl = b.match(/(?:[aeiouy]{1,2})/gi);
                        return (bl ? bl.length : 0) - (al ? al.length : 0)
                    });
            }

            selectSQL = `SELECT message FROM messages
            WHERE server = ?
            AND message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" 
            AND message LIKE "%${words[0]}%" AND date < ${message.createdAt.getTime()}
            ORDER BY RANDOM()
            LIMIT 1 `;
        }
    }

    database.db.get(selectSQL, [message.guild.id], (err, row) => {
        if (err)
            throw err;
        else {
            if (row)
                message.channel.send(row['message'].capitalize().normalizeSpaces());
            else
                speak(message, 0)
        }
    })
}