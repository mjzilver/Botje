
module.exports = function word(message, db) {
	const args = message.content.split(' ');
	const mention = message.mentions.users.first();

	if (args[2] == "?") {
		let selectSQL = `SELECT user_id, user_name, count(message) as count
		FROM messages
		WHERE message LIKE ? AND channel = ?
		GROUP BY user_id
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;

		db.all(selectSQL, ['%' + args[1] + '%', message.channel.id], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = "Top 10 users for the word " + args[1] + "\n"
				for (var i = 0; i < rows.length; i++) {
					result += '\n' + rows[i]['user_name'] + ' said the word ' + rows[i]['count'] + ' times!'
				}
				message.channel.send(result);
			}
		})
	} else if (args[2] && mention) {
		let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE message LIKE ? 
		AND channel = ? AND user_id = ? `;

		db.get(selectSQL, ['%' + args[2] + '%', message.channel.id, mention.id], (err, row) => {
			if (err) {
				throw err;
			} else {
				message.channel.send('Ive found ' + row['count'] + ' messages from ' + mention.username + ' in this channel that contain ' + args[2]);
			}
		})
	} else {
		let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE message LIKE ?AND channel = ? `;

		db.get(selectSQL, ['%' + args[1] + '%', message.channel.id], (err, row) => {
			if (err) {
				throw err;
			} else {
				message.channel.send('Ive found ' + row['count'] + ' messages in this channel that contain ' + args[1]);
			}
		})
	}
}