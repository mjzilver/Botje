let config = require('../config.json')
let database = require('../systems/database.js')

module.exports = {
	'name': 'count',
	'description': 'counts messages in the current channel or from the mentioned user',
	'format': 'count (@user  ? | %)',
	'function': function count(message) {
		const args = message.content.split(' ')
		const mentioned = message.mentions.users.first()
		var page = (args[2] ? args[2] - 1 : 0)

		if (args.length == 1) {
			total(message)
		} else if (mentioned) {
			mention(message, mentioned)
		} else if (args[1] == "?") {
			perPerson(message, page)
		} else if (args[1] == "%") {
			percentage(message, page)
		} else {
			bot.message.send(message, `I have no idea what you want, format is as follows: '${module.exports.format}'`)
		}
	}
}

function total(message) {
	let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE server = ?'

	database.query(selectSQL, [message.guild.id], (rows) => {
		bot.message.send(message, `Ive found ${rows[0]['count']} messages in ${message.guild.name}`)
	})
}

function mention(message, mentioned) {
	let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE server = ? AND user_id = ?'

	database.query(selectSQL, [message.guild.id, mentioned.id], (rows) => {
		bot.message.send(message, `Ive found ${rows[0]['count']} messages by ${mentioned.username} in this server`)
	})
}

function perPerson(message, page) {
	let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count
	FROM messages
	WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?
	GROUP BY LOWER(user_id)
	HAVING count > 1
	ORDER BY count DESC`

	database.query(selectSQL, [message.guild.id], (rows) => {
		var result = ""
		for (var i = page * 10; i < rows.length && i <= (page * 10) + 9; i++)
			result += `${rows[i]['user_name']} has posted ${rows[i]['count']} messages! \n`

		const top = new discord.MessageEmbed()
			.setColor(config.color_hex)
			.setTitle(`Top 10 posters in ${message.guild.name}`)
			.setDescription(result)
			.setFooter(`Page ${(page + 1)} of ${Math.ceil(rows.length / 10)}`)

		bot.message.send(message, {
			embeds: [top]
		})
	})
}

function percentage(message, page) {
	let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count,
		(SElECT COUNT(message) FROM messages WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?) as total
		FROM messages
		WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?
		GROUP BY LOWER(user_id)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`

	database.query(selectSQL, [message.guild.id, message.guild.id], (rows) => {
		var result = ""
		for (var i = page * 10; i < rows.length && i <= (page * 10) + 9; i++)
			result += `${rows[i]['user_name']} has posted ${Math.round((parseInt(rows[i]['count']) / parseInt(rows[i]['total'])) * 100)}% of all messages! \n`

		const top = new discord.MessageEmbed()
			.setColor(config.color_hex)
			.setTitle(`Top 10 posters in ${message.guild.name}`)
			.setDescription(result)
			.setFooter(`Page ${(page + 1)} of ${Math.ceil(rows.length / 10)}`)

		bot.message.send(message, {
			embeds: [top]
		})

	})
}