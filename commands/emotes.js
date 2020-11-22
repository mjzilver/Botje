module.exports = function emotes(message) {
	const args = message.content.split(' ');
	const mention = message.mentions.users.first();
	const db = global.database.db;

	if (args.length == 1) {
		let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE (message LIKE "%<%" OR message LIKE "%:%") AND message NOT LIKE "%@%"
		AND channel = ?
		GROUP BY LOWER(message)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;

		db.all(selectSQL, [message.channel.id], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = "```Top 10 must used emotes in this channel \n"
				for (var i = 0; i < rows.length; i++) {
					result += '\n' + rows[i]['message'] + ' said ' + rows[i]['count'] + ' times!'
				}
				message.channel.send(result + "```");
			}
		})
	} else if (args.length == 2 && mention) {
		let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE (message LIKE "%<%" OR message LIKE "%:%" ) AND message NOT LIKE "%@%"
		AND channel = ? AND user_id = ?
		GROUP BY LOWER(message)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;

		db.all(selectSQL, [message.channel.id, mention.id], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = "```Top 10 must used emotes in this channel said by " + mention.username + " \n"
				for (var i = 0; i < rows.length; i++) {
					result += '\n' + rows[i]['message'] + ' said ' + rows[i]['count'] + ' times!'
				}
				message.channel.send(result + "```");
			}
		})
	}
}