var PNGImage = require('pngjs-image');
var request = require('request');
const sqlite3 = require('sqlite3');
var logger = require('winston').loggers.get('logger');

// get the right configuration
if (dev)
	var config = require('./devconfig.json');
else
	var config = require('./config.json');

var package = require('./package.json');
var emoji = require('./emoji.json');
var db = new sqlite3.Database("./discord.db")

var Farm = require("./farm")

// person as key -> message as value
var imagesSent = [];
var imageSize = config.imageSize

// Initialize Discord Bot
var bot = global.bot

bot.on('ready', () => {
	logger.info('Connected');
	logger.info(`Logged in as: ${bot.user.username} - ${bot.user.id}`);
	initializeDatabase();
});

bot.login(config.token);

bot.on('error', function (error) {
	logger.error(error.message);
});

bot.on('message', message => {
	var channel = message.channel

	// look for the b! meaning bot command
	if (message.content.match(new RegExp(config.prefix, "i"))) {
		message.content = message.content.replace(new RegExp(config.prefix, "i"), '');
		const args = message.content.split(' ');
		const command = args.shift().toLowerCase();

		logger.log('debug', message.author.username + ' requested ' + command + ' with arguments ' + args);

		switch (command) {
			case 'help':
				helpFunction(channel, args[0])
				break;
			case 'image':
				getImage(message.author.username, channel, args[0]);
				break;
			case 'reddit':
				getRedditImage(message.author.username, channel, args[0]);
				break;
			case 'dog':
				getDogPicture(channel, args[0]);
				break;
			case 'emoji':
				turnIntoEmoji(channel, args);
				break;
			case 'react':
				reactTo(message, args.join(" "));
				break;
			case 'points':
				checkPoints(message);
				break;
			case 'ping':
				ping(channel, message);
				break;
			case 'delete':
				prune(message.author.username);
				break;
			case 'farm':
				farm(message, args);
				break;
			case 'draw':
				renderImage(message)
				break;
			default:
				break;
		}
	}
})

function initializeDatabase() {
	db.run(`CREATE TABLE IF NOT EXISTS images (link TEXT PRIMARY KEY, sub TEXT)`)
	db.run(`CREATE TABLE IF NOT EXISTS farm (user_id TEXT PRIMARY KEY UNIQUE, yield INTEGER, tier INTEGER, fence_tier INTEGER, time INTEGER, points INTEGER, planted_at INTEGER)`)
	db.run(`CREATE TABLE IF NOT EXISTS colors (x INTEGER,y INTEGER,red INTEGER,green INTEGER,blue INTEGER,PRIMARY KEY(x,y))`)
}

function helpFunction(channel, arg) {
	switch (arg) {
		case 'farm':
			channel.send(farmHelpMessage)
			break;
		default:
			channel.send(helpMessage)
			break;
	}
}

async function ping(channel, message) {
	const m = await message.channel.send("Ping?");
	m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(bot.ping)}ms`);
}

function getDogPicture(channel, breed = "") {
	if (breed == "") {
		request('https://dog.ceo/api/breeds/image/random', {
			json: true
		}, (err, res, body) => {
			if (err) {
				return logger.info(err)
			}
			channel.send(body.message);
		});
	} else {
		request(`https://dog.ceo/api/breed/${breed}/images/random`, {
			json: true
		}, (err, res, body) => {
			if (err) {
				return logger.info(err)
			}
			channel.send(body.message);
		});
	}
}

function turnIntoEmoji(channel, sentence) {
	sentence = sentence.join(' ');
	sentence = sentence.toLowerCase();
	var result = '';
	if (sentence.length > 0) {
		for (var i = 0; i < sentence.length; i++) {
			if (sentence.charAt(i) >= 'a' && sentence.charAt(i) <= 'z')
				result += emoji['letter_' + sentence.charAt(i)];
			result += ' ';
		}
	}
	channel.send(result);
}

function reactTo(message, sentence) {
	sentence = sentence.toLowerCase();

	if (sentence.length > 0) {
		var startchar = sentence.charAt(0); {
			if (startchar >= 'a' && startchar <= 'z') {
				message.react(emoji['letter_' + startchar]).then(setTimeout(() => {
					reactTo(message, sentence.substring(1));
				}, 500));
			} else {
				reactTo(message, sentence.substring(1));
			}
		}
	}
}

function checkPoints(message) {
	var mentioned_user = message.mentions.users.first();
	var member = message.guild.member(mentioned_user);

	var checkrepfor = 0;

	if (member)
		checkrepfor = mentioned_user;
	else
		checkrepfor = message.author

	let selectSQL = 'SELECT points FROM farm WHERE user_id = ' + checkrepfor.id;

	db.get(selectSQL, [], (err, row) => {
		if (err) {
			throw err;
		}

		if (row["points"] == null)
			message.channel.send('You dont have any good boy points');
		else
			message.channel.send(checkrepfor.username + ' has ' + row["points"] + ' good boy points');
	})
}

function renderImage(message) {
	var image = PNGImage.createImage(imageSize * 2, imageSize * 2);
	image.fillRect(0, 0, imageSize * 2, imageSize * 2, {
		red: 255,
		green: 255,
		blue: 255,
		alpha: 255
	})

	let selectSQL = 'SELECT * FROM colors';

	db.all(selectSQL, [], async (err, rows) => {
		if (err) {
			throw err;
		}
		for (var i = 0; i < rows.length; i++) {
			if (rows[i].x >= 0 && rows[i].x < imageSize && rows[i].y >= 0 && rows[i].y < imageSize) {
				image.fillRect(rows[i].x * 2, rows[i].y * 2, 2, 2, {
					red: rows[i].red,
					green: rows[i].green,
					blue: rows[i].blue,
					alpha: 255
				});
			}
		}

		image.writeImage('./views/images/image.png', function (err) {
			message.channel.send("Current image", {
				files: ["./views/images/image.png"]
			});
		});
	});
}

function farm(message, arguments) {
	var mentioned_user = message.mentions.users.first();
	var member = message.guild.member(mentioned_user);

	var channel = message.channel

	if (!member) {
		var selectedfarm = Farm.init(message.author);

		switch (arguments[0]) {
			case 'harvest':
				selectedfarm.harvest(channel)
				break;
			case 'seed':
				selectedfarm.seed(channel)
				break;
			case 'upgrade':
				selectedfarm.upgrade(channel)
				break;
			case 'fence':
				selectedfarm.upgradefence(channel)
				break;
			case 'info':
				selectedfarm.info(channel)
				break;
			case 'rename':
				selectedfarm.editnickname(channel, arguments.slice(1).join(' '))
				break;
			default:
				selectedfarm.print(channel)
				break;
		}
	} else {
		var selectedfarm = Farm.init(mentioned_user);

		switch (arguments[1]) {
			case 'info':
				selectedfarm.info(channel)
				break;
			default:
				selectedfarm.print(channel)
				break;
		}
	}
}

function prune(user, amount = 1) {
	if (imagesSent[user]) {
		imagesSent[user].delete().then(logger.log('warn', "deleted: " + imagesSent[user].content));
		delete imagesSent[user];
	}
}

function getImage(user, channel, sub, page = 0) {
	const options = {
		//https://api.imgur.com/3/gallery/r/{{subreddit}}/{{sort}}/{{window}}/{{page}}
		url: 'https://api.imgur.com/3/gallery/r/' + sub + '/hot/day/' + page,
		headers: {
			'Authorization': 'Client-ID ' + config.imgur
		},
		json: true
	};

	request(options, (err, res, body) => {
		if (err) {
			return logger.info(err)
		}
		if (typeof (body) !== 'undefined' && typeof (body.data) !== 'undefined' && typeof (body.data[0]) !== 'undefined') {
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

				for (var i = 0; i < body.data.length; i++) {
					if (!(body.data[i].link in foundImages))
						filteredImages.push(body.data[i]);
				}

				if (filteredImages.length > 0) {
					var chosen = Math.floor(Math.random() * filteredImages.length);
					var link = filteredImages[chosen].link;

					logger.debug('Image requested from ' + sub + ' received ' + filteredImages.length + ' chosen number ' + chosen);

					if (filteredImages[chosen].nsfw)
						imagesSent[user] = await channel.send('||' + link + '||');
					else
						imagesSent[user] = await channel.send(link);

					if (filteredImages[chosen].is_album)
						logger.info(filteredImages[chosen])


					var insert = db.prepare('INSERT INTO images (link, sub) VALUES (?, ?)', [link, sub]);

					insert.run(function (err) {
						if (err) {
							logger.error("failed to insert: " + link);
							logger.error(err);
						} else
							logger.log('debug', "inserted: " + link);
					});
				} else {
					if (body.data.length > 0) {
						logger.debug(page + ' page of images used');
						getImage(user, channel, sub, ++page);
					} else {
						channel.send("I have ran out of images to show you <:feelssad:445577555857113089>");
					}
				}
			});
		} else {
			channel.send("No images were found <:feelsdumb:445570808472141834>");
		}
	});
}

const snekfetch = require('snekfetch');

async function getRedditImage(user, channel, sub, page = 0) {
	try{
		const { body } = await snekfetch
		.get('https://www.reddit.com/r/' + sub + '.json?sort=top&t=week')
		.query({ limit: 800 });
		
		const randomnumber = Math.floor(Math.random() *  body.data.children.length)
		
		
		const embed = new discord.RichEmbed()
		.setTitle(body.data.children[randomnumber].data.title)
		.setImage(body.data.children[randomnumber].data.url)
		
		channel.send(embed)
	}
	catch{
		channel.send('Nothing was found :feelsdumb:')

	}
}


var helpMessage = `:robot: Current commands: :robot:  
\`image [subreddit]\`: gets a random picture from the given subreddit 
\`emoji\`: turns your message into emojis 
\`react\`: reacts to your post with emojis using the text you posted
\`points\`: check how much good boy points you have acquired
\`help farm \`: shows help for farm commands
\`delete \`:deletes the last message from you
\`ping\`: prints the current ping of the bot and the API
\`draw\`: prints the current drawing board 
\`draw\`: draw on the board here http://botje.ga/draw
\`http://botje.ga/\`: visit Botje's website 
\`Current Version\`: ` + package.version;

var farmHelpMessage = `:seedling: Current commands for farming: :seedling:  
\`farm\`: shows how your good boy point farm is doing
\`farm @person\`: shows how @person's good boy point farm is doing
\`farm harvest\`: harvest your good boy points
\`farm upgrade\`: give some points to upgrade your plants to produce one more point per plant
\`farm seed\`: give some points to plant an extra plant on your farm
\`farm info\`: displays information about your farm including upgrade costs and grow time
\`farm rename\`: renames your farm (format "[username]'s [farm name] farm")
\`farm fence\`: upgrades your fencing to a higher level
\`Current Version\`: ` + package.version;