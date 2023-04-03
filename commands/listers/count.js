let discord = require('discord.js')
let config = require('../../config.json')
let database = require('../../systems/database.js')
let Lister = require('./lister.js')

module.exports = {
	'name': 'count',
	'description': 'counts messages in the current channel or from the mentioned user',
	'format': 'count (@user  ? | %)',
	'function': (message) => {
		new CountLister().process(message)
	}
}

class CountLister extends Lister {
	constructor() {
		super()
	}

	total(message) {
		let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE server = ?'

		database.query(selectSQL, [message.guild.id], (rows) => {
			bot.message.send(message, `Ive found ${rows[0]['count']} messages in ${message.guild.name}`)
		})
	}

	mention(message, mentioned) {
		let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE server = ? AND user_id = ?'

		database.query(selectSQL, [message.guild.id, mentioned.id], (rows) => {
			bot.message.send(message, `Ive found ${rows[0]['count']} messages by ${mentioned.username} in this server`)
		})
	}

	perPerson(message, page) {
		let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count
		FROM messages
		WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?
		GROUP BY LOWER(user_id)
		HAVING count > 1
		ORDER BY count DESC`

		database.query(selectSQL, [message.guild.id], (rows) => {
			let result = ""
			for (let i = page * 10; i < rows.length && i <= (page * 10) + 9; i++)
				result += `${rows[i]['user_name']} has posted ${rows[i]['count']} messages! \n`

			logger.console(result)

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

	percentage(message, page) {
		let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count,
			(SElECT COUNT(message) FROM messages WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?) as total
			FROM messages
			WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND server = ?
			GROUP BY LOWER(user_id)
			HAVING count > 1
			ORDER BY count DESC 
			LIMIT 10`

		database.query(selectSQL, [message.guild.id, message.guild.id], (rows) => {
			let result = ""
			for (let i = page * 10; i < rows.length && i <= (page * 10) + 9; i++)
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
}