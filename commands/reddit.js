var request = require('request');

module.exports = async function getRedditImage(message, last = '') {
	const db = database.db;
	const args = message.content.split(' ');
	var sub = args[1]
	var channel = message.channel
	
	const options = {
		url: 'https://www.reddit.com/r/' + sub + '.json?sort=top&t=week&limit=100&after=' + last,
		json: true
	};

	request(options, (err, res, body) => {
		if (err) {
			return logger.error(err)
		}

		if (typeof (body) !== 'undefined' && typeof (body.data) !== 'undefined' && typeof (body.data.children) !== 'undefined') {
			let selectSQL = 'SELECT * FROM images WHERE sub = "' + sub + '"';
			var foundImages = {};

			db.all(selectSQL, [], async (err, rows) => {
				if (err) 
					throw err;

				for (var i = 0; i < rows.length; i++) 
					foundImages[rows[i].link] = true;

				var filteredImages = [];

				for (var i = 0; i < body.data.children.length; i++) 
					if (!(body.data.children[i].data.url in foundImages) && body.data.children[i].data.url.isImage())
						filteredImages.push(body.data.children[i]);

				if (filteredImages.length > 0) {
					var chosen = Math.floor(Math.random() * filteredImages.length);
					var post = filteredImages[chosen].data;

					if(post.url && post.url.isImage())
					{
						const image = new discord.MessageEmbed()
							.setColor(config.color_hex)
							.setTitle(post.title)
							.addField('Updoots', post.score, true)
							.addField('Posted by', post.author, true)
							.setImage(post.url)
							.setURL(`https://reddit.com${post.permalink}`)
							.setFooter(`From: reddit/r/${sub}`)
						channel.send(image);
					} else                       
						channel.send(post.title + "\n" + post.url)
					
					var insert = db.prepare('INSERT INTO images (link, sub) VALUES (?, ?)', [post.url, sub]);
					insert.run(function (err) {
						if (err) {
							logger.error(`failed to insert: ${post.url} - ${sub}`);
							logger.error(err);
						} else
							logger.log('debug', `inserted: ${post.url} - ${sub}`);
					});
				} else {
					if (body.data.children.length >= 100) {
						logger.debug('Finding posts before post ' + body.data.children[body.data.children.length - 1].data.title);
						getRedditImage(message, body.data.children[body.data.children.length - 1].data.name);
					} else 
						channel.send("I have ran out of images to show you");
				}
			});
		} else 
			channel.send("No images were found");
	})
}