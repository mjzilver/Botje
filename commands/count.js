
module.exports = function count(message, db) {
	const args = message.content.split(' ');
	const mention = message.mentions.users.first();

	if (args.length == 1) {
		let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE channel = ?';

		db.get(selectSQL, [message.channel.id], (err, row) => {
			if (err) {
				throw err;
			} else {
				message.channel.send('Ive found ' + row['count'] + ' messages in this channel');
			}

		})
	} else if (args.length == 2 && mention) {
		let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE channel = ? AND user_id = ?';

		db.get(selectSQL, [message.channel.id, mention.id], (err, row) => {
			if (err) {
				throw err;
			} else {
				message.channel.send('Ive found ' + row['count'] + ' messages by ' + mention.username + ' in this channel');
			}

		})
	} else if (args.length == 2 && args[1] == "?") {
		let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count
		FROM messages
		WHERE user_id NOT LIKE "%<%" AND message NOT LIKE "%:%" AND channel = ?
		GROUP BY LOWER(user_id)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;

		db.all(selectSQL, [message.channel.id], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = "Top 10 posters in this channel \n"
				for (var i = 0; i < rows.length; i++) {
					result += '\n' + rows[i]['user_name'] + ' has posted ' + rows[i]['count'] + ' messages!'
				}
				message.channel.send(result);
			}
		})
	}
}