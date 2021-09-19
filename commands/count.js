module.exports = {
	'name': 'count',
	'description': 'counts messages in the current channel or from the mentioned user',
	'format': 'count (@user)',
	'function': function count(message) {
		const args = message.content.split(' ')
		const mention = message.mentions.users.first()
		const db = database.db

		if (args.length == 1) {
			let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE server = ?'

			db.get(selectSQL, [message.guild.id], (err, row) => {
				if (err)
					throw err
				else
					message.channel.send(`Ive found ${row['count']} messages in ${message.guild.name}`)
			})
		} else if (args.length == 2 && mention) {
			let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE server = ? AND user_id = ?'

			db.get(selectSQL, [message.guild.id, mention.id], (err, row) => {
				if (err)
					throw err
				else
					message.channel.send(`Ive found ${row['count']} messages by ${mention.username} in this server`)
			})
		} else if (args.length >= 2 && args[1] == "?") {
			let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count
			FROM messages
			WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?
			GROUP BY LOWER(user_id)
			HAVING count > 1
			ORDER BY count DESC`

			var page = (args[2] ? args[2] - 1 : 0)

			db.all(selectSQL, [message.guild.id], (err, rows) => {
				if (err) {
					throw err
				} else {
					var result = ""
					for (var i = page * 10; i < rows.length && i <= (page * 10) + 9; i++)
						result += `${rows[i]['user_name']} has posted ${rows[i]['count']} messages! \n`

					const top = new discord.MessageEmbed()
						.setColor(config.color_hex)
						.setTitle(`Top 10 posters in ${message.guild.name}`)
						.setDescription(result)
						.setFooter(`Page ${(page + 1)} of ${Math.ceil(rows.length / 10)}`)

					message.channel.send({embeds: [top]})
				}
			})
		} else if (args.length == 2 && args[1] == "%") {
			let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count,
			(SElECT COUNT(message) FROM messages WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?) as total
			FROM messages
			WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?
			GROUP BY LOWER(user_id)
			HAVING count > 1
			ORDER BY count DESC 
			LIMIT 10`

			var page = (args[2] ? args[2] - 1 : 0)

			db.all(selectSQL, [message.guild.id, message.guild.id], (err, rows) => {
				if (err) {
					throw err
				} else {
					var result = ""
					for (var i = page * 10; i < rows.length && i <= (page * 10) + 9; i++)
						result += `${rows[i]['user_name']} has posted ${Math.round((parseInt(rows[i]['count']) / parseInt(rows[i]['total'])) * 100)}% of all messages! \n`

					const top = new discord.MessageEmbed()
						.setColor(config.color_hex)
						.setTitle(`Top 10 posters in ${message.guild.name}`)
						.setDescription(result)
						.setFooter(`Page ${(page + 1)} of ${Math.ceil(rows.length / 10)}`)

						message.channel.send({embeds: [top]})
					}
			})
		}
	}
}