module.exports = function count(message) {
	const args = message.content.split(' ');
	const mention = message.mentions.users.first();
	const db = database.db;

	if (args.length == 1) {
		let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE channel = ?';

		db.get(selectSQL, [message.channel.id], (err, row) => {
			if (err) 
				throw err;
			else 
				message.channel.send(`Ive found ${row['count']} messages in this channel`);
		})
	} else if (args.length == 2 && mention) {
		let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE channel = ? AND user_id = ?';

		db.get(selectSQL, [message.channel.id, mention.id], (err, row) => {
			if (err) 
				throw err;
			else 
				message.channel.send(`Ive found ${row['count']} messages by ${mention.username} in this channel`);
		})
	} else if (args.length == 2 && args[1] == "?") {
		let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count
		FROM messages
		WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND channel = ?
		GROUP BY LOWER(user_id)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;

		db.all(selectSQL, [message.channel.id], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = ""
				for (var i = 0; i < rows.length; i++) 
					result += `${rows[i]['user_name']} has posted ${rows[i]['count']} messages! \n`

				const top = new discord.MessageEmbed()
					.setColor(config.color_hex)
					.setTitle(`Top 10 posters in #${message.channel.name}`)
					.setDescription(result);

				message.channel.send(top);
			}
		})
	} else if (args.length == 2 && args[1] == "%") {
        let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count,
        (SElECT COUNT(message) FROM messages WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND channel = ?) as total
		FROM messages
		WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND channel = ?
		GROUP BY LOWER(user_id)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;

		db.all(selectSQL, [message.channel.id, message.channel.id], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = "";
				for (var i = 0; i < rows.length; i++) 
					result += `${rows[i]['user_name']} has posted ${Math.round((parseInt(rows[i]['count']) / parseInt(rows[i]['total'])) * 100)}% of all messages! \n`

				const top = new discord.MessageEmbed()
					.setColor(config.color_hex)
					.setTitle(`Top 10 posters in #${message.channel.name}`)
					.setDescription(result);

				message.channel.send(top);
			}
		})
	}
}