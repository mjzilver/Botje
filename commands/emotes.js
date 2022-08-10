module.exports = {
    'name': 'emotes',
    'description': 'shows the top 10 emotes in the current channel or from the mentioned user',
    'format': 'emotes (@user)',
    'function': function emotes(message) {
        const args = message.content.split(' ')
        const mention = message.mentions.users.first()
        const db = database.db

        if (args.length == 1) {
            let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE (message LIKE "%<%" OR message LIKE "%:%") AND message NOT LIKE "%@%"
            AND server = ?
            GROUP BY LOWER(message)
            HAVING count > 1
            ORDER BY count DESC 
            LIMIT 10`

            db.all(selectSQL, [message.guild.id], (err, rows) => {
                if (err) {
                    throw err
                } else {
                    var result = ""
                    for (var i = 0; i < rows.length; i++)
                        result += `${rows[i]['message']} said ${rows[i]['count']} times! \n`

                    const top = new discord.MessageEmbed()
                        .setColor(config.color_hex)
                        .setTitle(`Top 10 most used emotes in ${message.guild.name}`)
                        .setDescription(result)

                    bot.message.send(message, { embeds: [top] })
                }
            })
        } else if (args.length == 2 && mention) {
            let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
            FROM messages
            WHERE (message LIKE "%<%" OR message LIKE "%:%" ) AND message NOT LIKE "%@%"
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
                    for (var i = 0; i < rows.length; i++)
                        result += `${rows[i]['message']} said ${rows[i]['count']} times! \n`

                    const top = new discord.MessageEmbed()
                        .setColor(config.color_hex)
                        .setTitle(`Top 10 most used emotes in ${message.guild.name} used by ${mention.username}`)
                        .setDescription(result)

                    bot.message.send(message, { embeds: [top] })
                }
            })
        }
    }
}