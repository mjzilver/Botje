var request = require('request');

module.exports = async function getRedditImage(message, last = '') {
	const db = global.database.db;
	const args = message.content.split(' ');
	var sub = args[1]
	var channel = message.channel
	
	const options = {
		url: 'https://www.reddit.com/r/' + sub + '.json?sort=top&t=week&limit=100&after=' + last,
		json: true
	};

	request(options, (err, res, body) => {
		if (err) {
			return global.logger.info(err)
		}

		if (typeof (body) !== 'undefined' && typeof (body.data) !== 'undefined' && typeof (body.data.children) !== 'undefined') {
			let selectSQL = 'SELECT * FROM images WHERE sub = "' + sub + '"';
			var foundImages = {};

			db.all(selectSQL, [], async (err, rows) => {
				if (err) {
					throw err;
				}
				for (var i = 0; i < rows.length; i++) {
					foundImages[rows[i].link] = true;
				}

				var filteredImages = [];

				for (var i = 0; i < body.data.children.length; i++) {
					if (!(body.data.children[i].data.url in foundImages))
						filteredImages.push(body.data.children[i]);
				}

				if (filteredImages.length > 0) {
					var chosen = Math.floor(Math.random() * filteredImages.length);
					var link = filteredImages[chosen].data.url;
					var title = filteredImages[chosen].data.title;

					global.logger.debug('Image requested from ' + sub + ' received ' + filteredImages.length + ' chosen number ' + chosen);

					channel.send(title + "\n" + link)

					var insert = db.prepare('INSERT INTO images (link, sub) VALUES (?, ?)', [link, sub]);
					insert.run(function (err) {
						if (err) {
							global.logger.error("failed to insert: " + link + ' - ' + sub);
							global.logger.error(err);
						} else
							global.logger.log('debug', "inserted: " + link + ' - ' + sub);
					});
				} else {
					if (body.data.children.length > 0) {
						global.logger.debug('Finding posts before post ' + body.data.children[body.data.children.length - 1].data.title);
						getRedditImage(message, body.data.children[body.data.children.length - 1].data.name);
					} else {
						channel.send("I have ran out of images to show you");
					}
				}
			});
		} else {
			channel.send("No images were found");
		}
	})
}