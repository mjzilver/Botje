const database = require("../systems/database");

module.exports = function speak(message, monthsOld = 5, findWord = 1) {
    var earliest = new Date();
    earliest.setMonth(earliest.getMonth() - monthsOld);

    let selectSQL = `SELECT message, LENGTH(message) as len FROM messages
    WHERE server = ?
    AND message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" 
    AND len < 100 AND date < ${earliest.getTime()}
    ORDER BY RANDOM()
    LIMIT 1 `;

    if (findWord) {
        message.content = message.content.replace(new RegExp(/(\b|^| )(:.+:|<.+>)( *|$)/, "gi"), '');
        message.content = message.content.replace(new RegExp(/(\b)(bot(je)?)( *|\b)/, "gi"), '');
        message.content = message.content.textOnly();
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

            selectSQL = `SELECT message, LENGTH(message) as len FROM messages
            WHERE server = ?
            AND message NOT LIKE "%http%" AND message NOT LIKE "%www%" AND message NOT LIKE "%bot%" AND len < 100
            AND message LIKE "%${words[0]}%" AND date < ${message.createdAt.getTime()} AND date < ${earliest.getTime()}
            ORDER BY RANDOM()
            LIMIT 1 `;
            logger.log('debug', `Sending message with '${words[0]}' in it`)
        } else
            logger.log('debug', `Sending message with no context - no suitable word found`)
    } else 
        logger.log('debug', `Sending message with no context - no match in DB`)

    database.db.get(selectSQL, [message.guild.id], (err, row) => {
        if (err)
            throw err;
        else {
            if (row)
                message.channel.send(row['message'].capitalize().normalizeSpaces());
            else
                speak(message, --monthsOld, 0)
        }
    })
}