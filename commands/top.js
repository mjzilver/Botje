module.exports = {
    'name': 'top',
    'description': 'shows the top 10 emotes in the current channel or from mentioned user',
    'format': 'top (@user)',
    'function': function top(message) {
        const args = message.content.split(' ')
        const mentioned = message.mentions.users.first()

        if (mentioned) {
            mention(message, mentioned)
        } else {
            perPerson(message)
        }
    }
}

function perPerson(message) {
    let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
    FROM messages
    WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?
    GROUP BY LOWER(message)
    HAVING count > 1
    ORDER BY count DESC 
    LIMIT 10`

    database.query(selectSQL, [message.guild.id], (rows) => {
        var result = ""
        for (var i = 0;
            (i < rows.length && i <= 10); i++)
            result += `${rows[i]['message']} was said ${rows[i]['count']} times \n`

        const top = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(`Top 10 must used sentences in ${message.guild.name}`)
            .setDescription(result)

        message.channel.send({
            embeds: [top]
        })
    })
}

function mention(message, mentioned) {
    let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
    FROM messages
    WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" 
    AND server = ? AND user_id = ?
    GROUP BY LOWER(message)
    HAVING count > 1
    ORDER BY count DESC 
    LIMIT 10`

    database.query(selectSQL, [message.guild.id, mentioned.id], (rows) => {
        var result = ""
        for (var i = 0;
            (i < rows.length && i <= 10); i++)
            result += `${rows[i]['message']} was said ${rows[i]['count']} times \n`

        const top = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(`Top 10 must used sentences in ${message.guild.name} by ${mentioned.username}`)
            .setDescription(result)

        message.channel.send({
            embeds: [top]
        })
    })
}