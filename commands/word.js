module.exports = {
	'name': 'word',
	'description': 'shows how many times a word has been said in the current channel, ? per user or from mentioned user',
	'format': 'word (@user) [word] (?)',
	'function': function word(message) {
		const args = message.content.match(/([^" ]+)|"([^"]+)"/gi)
		const mention = message.mentions.users.first()
		const db = database.db

		if (args[2] == "?") {
			let selectSQL = `SELECT user_id, user_name, count(message) as count
		FROM messages
		WHERE message LIKE ? AND server = ?
		GROUP BY user_id
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`

			db.all(selectSQL, ['%' + args[1].removeQuotes() + '%', message.guild.id], (err, rows) => {
				if (err) {
					throw err
				} else {
					var result = ""
					for (var i = 0;
						(i < rows.length && i <= 10); i++)
						result += `${rows[i]['user_name']} has said ${args[1]} ${rows[i]['count']} times! \n`

					if (result == "")
						return message.channel.send(`Nothing found for ${args[1]} in ${message.guild.name} `)

					const top = new discord.MessageEmbed()
						.setColor(config.color_hex)
						.setTitle(`Top 10 users for the word ${args[1]} in ${message.guild.name} `)
						.setDescription(result)

					message.channel.send({embeds: [top]})
				}
			})
		} else if (args[2] && mention) {
			let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE message LIKE ? 
		AND server = ? AND user_id = ? `

			db.get(selectSQL, ['%' + args[2].removeQuotes() + '%', message.guild.id, mention.id], (err, row) => {
				if (err)
					throw err
				else
					message.channel.send(`Ive found ${row['count']} messages from${mention.username} in this server that contain ${args[2]}`)
			})
		} else {
			let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE message LIKE ? AND server = ? `

			db.get(selectSQL, ['%' + args[1].removeQuotes() + '%', message.guild.id], (err, row) => {
				if (err)
					throw err
				else
					message.channel.send(`Ive found ${row['count']} messages in this server that contain ${args[1]}`)
			})
		}
	}
}