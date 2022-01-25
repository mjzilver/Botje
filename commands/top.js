module.exports = {
    'name': 'top',
    'description': 'shows the top 10 emotes in the current channel or from mentioned user',
    'format': 'top (@user)',
    'function': function top(message) {
        const args = message.content.split(' ')
        const mention = message.mentions.users.first()
        const db = database.db

        if (args.length == 1) {
            let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?
            GROUP BY LOWER(message)
            HAVING count > 1
            ORDER BY count DESC 
            LIMIT 10`

            db.all(selectSQL, [message.guild.id], (err, rows) => {
                if (err) {
                    throw err
                } else {
                    var result = ""
                    for (var i = 0; (i < rows.length && i <= 10); i++)
                        result += `${rows[i]['message']} was said ${rows[i]['count']} times \n`

                    const top = new discord.MessageEmbed()
                        .setColor(config.color_hex)
                        .setTitle(`Top 10 must used sentences in ${message.guild.name}`)
                        .setDescription(result)

                    message.channel.send({embeds: [top]})
                }
            })
        } else if (args.length == 2 && mention) {
            let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" 
            AND server = ? AND user_id = ?
            GROUP BY LOWER(message)
            HAVING count > 1
            ORDER BY count DESC 
            LIMIT 10`

            db.all(selectSQL, [message.guild.id, mention.id], (err, rows) => {
                if (err) {
                    throw err
                } else {
                    var result = ""
                    for (var i = 0; (i < rows.length && i <= 10); i++)
                        result += `${rows[i]['message']} was said ${rows[i]['count']} times \n`

                    const top = new discord.MessageEmbed()
                        .setColor(config.color_hex)
                        .setTitle(`Top 10 must used sentences in ${message.guild.name} by ${mention.username}`)
                        .setDescription(result)

                    message.channel.send({embeds: [top]})
                }
            })
        }
    }
}