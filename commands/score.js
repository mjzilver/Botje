var letter_values = require('../json/letter_values.json');

function calculateScore(message)
{
	var score = 0;
	for (var i = 0; i < message.length; i++) {
		score += letter_values[message.charAt(i)] === undefined ? 0 : letter_values[message.charAt(i)]
	}
	return score;
}

module.exports = function score(message) {
	const mention = message.mentions.users.first();
	const db = database.db;

	if(mention) {
		let selectSQL = `SELECT user_id, user_name, message
		FROM messages 
		WHERE channel = ${message.channel.id} AND user_id = ${mention.id} `

		var userdata = {'points': 0, 'total': 0, 'quality' : 0, 'score': 0}

		db.all(selectSQL, [], (err, rows) => {
			if (err) {
				throw err;
			} else {
				for (var i = 0; i < rows.length; i++) {
					userdata['points'] += calculateScore(rows[i]['message'])

					userdata['total'] += rows[i]['message'].length
				}

				userdata['quality'] = ((userdata['points'] / userdata['total']) / 2);
                userdata['score'] = Math.round(userdata[user]['total'] * userdata[user]['quality'])

				message.channel.send(`${mention.username}'s post score is ${userdata['score']}`);
			}
		})
	} else {
		let selectSQL = `SELECT user_id, user_name, message
		FROM messages 
		WHERE channel = ${message.channel.id}
		ORDER BY user_id`

		var userdata = {};

		db.all(selectSQL, [], (err, rows) => {
			if (err) {
				throw err;
			} else {
				for (var i = 0; i < rows.length; i++) {
					var user_name = rows[i]['user_name']

					if(!userdata[user_name])
						userdata[user_name] = {'points': 0, 'total': 0, 'quality' : 0, 'score': 0 };

					userdata[user_name]['points'] += calculateScore(rows[i]['message'])

					userdata[user_name]['total'] += rows[i]['message'].length
				}

				var sorted = [];
				for (var user in userdata) {
					// magical calculation
                    userdata[user]['quality'] = (userdata[user]['points'] / userdata[user]['total']) / 2;
                    userdata[user]['score'] = Math.round(userdata[user]['total'] * userdata[user]['quality'])

					sorted.push([user, userdata[user]['score']]);
				}
				
				sorted.sort(function(a, b) {
					return b[1]- a[1];
				});
				var result = "```Top 10 posters \n"

				for (var i = 0; (i < sorted.length && i <= 10); i++) {
					result += '\n' + sorted[i][0] + '\'s post score is ' + sorted[i][1]
				}
				message.channel.send(result + "```");
			}
		})
	}
}