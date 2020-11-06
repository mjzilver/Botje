var PNGImage = require('pngjs-image');
var request = require('request');
const sqlite3 = require('sqlite3');
var logger = require('winston').loggers.get('logger');

// get the right configuration
var dev = false;
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

// person as key -> time as value
var lastRequest = [];
// adding the timer (so the timeout stacks)
var lastRequestTimer = [];

// Initialize Discord Bot
var bot = global.bot

// markov chain
var chain = {};

var maxMarkov = 1000000

var fs = require('fs');

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

	storemsg(message)


	// look for the b! meaning bot command
	if (message.content.match(new RegExp(config.prefix, "i"))) {
		message.content = message.content.replace(new RegExp(config.prefix, "i"), '');
		const args = message.content.split(' ');
		const command = args.shift().toLowerCase();
		
		var allowed = true;
		
		currentTimestamp = new Date();
		
		// no more bert
		if(message.author.id === '177970000420798464')
		{
			allowed = false;
		}
		
		
		if(!(message.author.username in lastRequest) || message.member.hasPermission("ADMINISTRATOR")) {
			lastRequest[message.author.username] = currentTimestamp;
		} else {
			// set timer
			lastRequestTimer[message.author.username] = (message.author.username in lastRequestTimer) ? lastRequestTimer[message.author.username]: 5;
			currentTimer = lastRequestTimer[message.author.username];
			
			if((currentTimestamp - lastRequest[message.author.username] < (currentTimer * 1000)))
			{
				lastRequestTimer[message.author.username] = currentTimer + 5;
				
				var diff = new Date(currentTimestamp.getTime() - lastRequest[message.author.username].getTime());
				if(currentTimer == 5)
					channel.send('You need to wait ' + (currentTimer - diff.getSeconds()) + ' seconds <:genoeg1:445570292023296022>')
				else 
					channel.send('You need to wait ' + (currentTimer - diff.getSeconds()) + ' seconds, added 5 seconds because you didnt wait <:genoeg2:445570451859570688>')

				allowed = false;
			}
			else {
				lastRequestTimer[message.author.username] = 5;
				lastRequest[message.author.username] = currentTimestamp;
			}
		}
		
		logger.log('debug', message.author.username + ' requested ' + command + ' with arguments ' + args);

		if(allowed)
		{
			switch (command) {
				case 'help':
					helpFunction(channel, args[0])
					break;
				case 'reddit':
					getRedditImage(message.author.username, channel, args[0]);
					break;
				case 'emoji':
					turnIntoEmoji(channel, args);
					break;
				case 'ping':
					ping(channel, message);
					break;
				case 'delete':
					prune(message.author.username);
					break;
				case 'purge':
					purge(message);
					break;
				case 'speak':
					speak(message);
					break;
				case 'catalog':
					catalog(message);
					break;
				case 'count':
					count(message);
					break;
				case 'top':
					top(message);
					break;
				case 'word':
					word(message);
					break;
				case 'emotes':
					emotes(message);
					break;
				default:
					break;
			}
		} 
	}
})

function initializeDatabase() {
	db.run(`CREATE TABLE IF NOT EXISTS images (link TEXT PRIMARY KEY, sub TEXT)`)
	db.run(`CREATE TABLE IF NOT EXISTS farm (user_id TEXT PRIMARY KEY UNIQUE, yield INTEGER, tier INTEGER, fence_tier INTEGER, time INTEGER, points INTEGER, planted_at INTEGER)`)
	db.run(`CREATE TABLE IF NOT EXISTS messages (user_id TEXT, user_name TEXT, message TEXT, date TEXT, channel TEXT, PRIMARY KEY(user_id, date, channel))`)
	db.run(`CREATE TABLE IF NOT EXISTS colors (x INTEGER,y INTEGER,red INTEGER,green INTEGER,blue INTEGER, PRIMARY KEY(x,y))`)
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

function storemsg(message) {
	if(message.content.length >= 5 && !message.author.equals(bot.user) && !message.content.match(new RegExp(config.prefix, "i")))
	{
		var insert = db.prepare('INSERT OR IGNORE INTO messages (user_id, user_name, message, channel, date) VALUES (?, ?, ?, ?, ?)', 
			[message.author.id, message.author.username, message.content, message.channel.id, message.createdAt.getTime()]);	
		insert.run(function (err) {
			if (err) {
				logger.error("failed to insert: " + message.content + ' posted by ' + message.author.username);
				logger.error(err);
			}
		});
	}
}

async function purge(message)
{
	if(message.author.id === '265610043691499521')
	{
		message.channel.fetchMessages()
		.then(messages => messages.array().forEach(
			(message) => {
				if(message.author.equals(bot.user) || message.content.match(new RegExp(config.prefix, "i")))
				{
					logger.log('debug', 'Purging message: ' + message.content);
					message.delete()
				}
			}
		));
	}
}

function speak(message)
{
	var chain = JSON.parse(fs.readFileSync("json/" + message.channel.id +".json"));
	var sentence = "";
	var sentenceLength = Math.floor(Math.random() * 3) + 2
	
	if(chain[""])
	{
		var previousWord = chain[""][Math.floor(Math.random() * chain[""].length)]
		sentence += previousWord
		
		for(i = 0; i < sentenceLength-1; i++)
		{				
			if(!chain[previousWord])
			{
				var currentWord = chain[""][Math.floor(Math.random() * chain[""].length)]
			} else {				
				var currentWord = chain[previousWord][Math.floor(Math.random() * chain[previousWord].length)]
			}
			
			sentence += " " + currentWord
			previousWord = currentWord
		}
			
		message.channel.send(sentence);
	} 
}

function count(message)
{
	const args = message.content.split(' ');
	const mention = message.mentions.users.first();
	
	if(args.length == 1)
	{
		let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE channel = ' + message.channel.id;

		db.get(selectSQL, [], (err, row) => {
			if (err) {
				throw err;
			} else {
				message.channel.send('Ive found '+ row['count'] +' messages in this channel');
			}

		})
	} else if(args.length == 2 && mention) {
		let selectSQL = 'SELECT COUNT(*) as count FROM messages WHERE channel = ' + message.channel.id + ' AND user_id = ' + mention.id;

		db.get(selectSQL, [], (err, row) => {
			if (err) {
				throw err;
			} else {
				message.channel.send('Ive found '+ row['count'] +' messages by ' + mention.username + ' in this channel');
			}

		})
	} else if(args.length == 2 && args[1] == "*") {
		let selectSQL = `SELECT LOWER(user_id) as user_id, user_name, COUNT(*) as count
		FROM messages
		WHERE user_id NOT LIKE "%<%" AND message NOT LIKE "%:%" AND channel = "` + message.channel.id +`"
		GROUP BY LOWER(user_id)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;
		
		db.all(selectSQL, [], (err, rows) => {
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

function word(message)
{
	const args = message.content.split(' ');
	const mention = message.mentions.users.first();

	if(!mention && !args[2])
	{
		let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE message LIKE "%` + args[1] + `%" AND channel = "` + message.channel.id + '"';
		
		db.get(selectSQL, [], (err, row) => {
			if (err) {
				throw err;
			} else {
				message.channel.send('Ive found '+ row['count'] +' messages in this channel that contain ' + args[1]);
			}
		})
	} else if (args[2] && mention) {
		let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE message LIKE "%` + args[2] + `%" 
		AND channel = "` + message.channel.id +`" AND user_id = "` + mention.id  + '"';
		
		db.get(selectSQL, [], (err, row) => {
			if (err) {
				throw err;
			} else {
				message.channel.send('Ive found '+ row['count'] +' messages from ' + mention.username + ' in this channel that contain ' + args[2]);
			}
		})
	} else if (args[2] == "?")
	{
		let selectSQL = `SELECT user_id, user_name, count(message) as count
		FROM messages
		WHERE message LIKE "%` + args[1] + `%" AND channel = "` + message.channel.id + `"
		GROUP BY user_id
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;
		
		db.all(selectSQL, [], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = "Top 10 users for the word " + args[1]  +"\n"
				for (var i = 0; i < rows.length; i++) {
					result += '\n' + rows[i]['user_name'] + ' said the word ' + rows[i]['count'] + ' times!'
				}
				message.channel.send(result);
			}
		})
	}
}

function top(message)
{
	const args = message.content.split(' ');
	const mention = message.mentions.users.first();

	if(args.length == 1)
	{
		let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" AND channel = "` + message.channel.id +`"
		GROUP BY LOWER(message)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;
		
		db.all(selectSQL, [], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = "Top 10 must used sentences in this channel \n"
				for (var i = 0; i < rows.length; i++) {
					result += '\n' + rows[i]['message'] + ' said ' + rows[i]['count'] + ' times!'
				}
				message.channel.send(result);
			}
		})
	} else if(args.length == 2 && mention){
		let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE message NOT LIKE "%<%" AND message NOT LIKE "%:%" 
		AND channel = "` + message.channel.id +`" AND user_id = "` + mention.id + `"
		GROUP BY LOWER(message)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;
		
		db.all(selectSQL, [], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = "Top 10 must used sentences in this channel said by " + mention.username +" \n"
				for (var i = 0; i < rows.length; i++) {
					result += '\n' + rows[i]['message'] + ' said ' + rows[i]['count'] + ' times!'
				}
				message.channel.send(result);
			}
		})
	} 
}

function emotes(message)
{
	const args = message.content.split(' ');
	const mention = message.mentions.users.first();

	if(args.length == 1)
	{
		let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE (message LIKE "%<%" OR message LIKE "%:%") AND message NOT LIKE "%@%"
		AND channel = "` + message.channel.id +`"
		GROUP BY LOWER(message)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;
		
		db.all(selectSQL, [], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = "Top 10 must used emotes in this channel \n"
				for (var i = 0; i < rows.length; i++) {
					result += '\n' + rows[i]['message'] + ' said ' + rows[i]['count'] + ' times!'
				}
				message.channel.send(result);
			}
		})
	} else if(args.length == 2 && mention){
		let selectSQL = `SELECT LOWER(message) as message, COUNT(*) as count
		FROM messages
		WHERE (message LIKE "%<%" OR message LIKE "%:%" ) AND message NOT LIKE "%@%"
		AND channel = "` + message.channel.id +`" AND user_id = "` + mention.id + `"
		GROUP BY LOWER(message)
		HAVING count > 1
		ORDER BY count DESC 
		LIMIT 10`;
		
		db.all(selectSQL, [], (err, rows) => {
			if (err) {
				throw err;
			} else {
				var result = "Top 10 must used emotes in this channel said by " + mention.username +" \n"
				for (var i = 0; i < rows.length; i++) {
					result += '\n' + rows[i]['message'] + ' said ' + rows[i]['count'] + ' times!'
				}
				message.channel.send(result);
			}
		})
	} 
}

function catalog(message, loop = 0)
{	
	if(loop == 0)
		message.delete()

	var itemsProcessed = 0; 

	message.channel.fetchMessages({ limit: 100, before: message.id })
	.then(messages => messages.array().forEach(
		(message) => {
			itemsProcessed++;

			if(!message.author.equals(bot.user) && !message.content.match(new RegExp(config.prefix, "i")))
			{
				storemsg(message);
				
				const words = message.content.split(' ')
				var prevWord = "";

				for(var i = 0; i < words.length; i += 3)
				{
					if(words[i] !== undefined && words[i+1] !== undefined && words[i+2] !== undefined)
					{
						var word = words[i] +" "+ words[i+1] +" "+ words[i+2];
						word = word.toLowerCase()
											
						if (!chain[prevWord])
						{
							i == words.length+1;
							chain[prevWord] = [word]
						} else 
						{
							chain[prevWord].push(word)
						}
						prevWord = word;
					} else if (chain[prevWord] && prevWord.length >= 2)
					{
						var word = words[i];
						if(words[i+1] !== undefined)	
							word += words[i+1]
						
						i == words.length+1;
						chain[prevWord] = [word]
					}
				}
			} 
			
			if(itemsProcessed === messages.array().length)
			{											
				if(itemsProcessed == 100 && loop <= maxMarkov/100)
				{
					logger.log('debug', "100 messages scanned - total ~" + loop*100 + " messages")
					catalog(message, ++loop);
				} else 
				{
					logger.log('debug', "End reached ~" + loop * 100 + " messages catalogged")

					fs.writeFile("json/" + message.channel.id +".json", JSON.stringify(chain), err => {})
				}
			}
		}
	));
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

					imagesSent[user] = await channel.send(link);

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

async function getRedditImage(user, channel, sub, last = '') {
	const options = {
		url: 'https://www.reddit.com/r/' + sub + '.json?sort=top&t=week&limit=100&after=' + last,
		json: true
	};

	request(options, (err, res, body) => {		
		if (err) {
			return logger.info(err)
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

					logger.debug('Image requested from ' + sub + ' received ' + filteredImages.length + ' chosen number ' + chosen);

					imagesSent[user] = await channel.send(title + "\n" + link)

					var insert = db.prepare('INSERT INTO images (link, sub) VALUES (?, ?)', [link, sub]);

					var query = insert.run(function (err) {
						if (err) {
							logger.error("failed to insert: " + link + ' - ' + sub);
							logger.error(err);
						} else
							logger.log('debug', "inserted: " + link + ' - ' + sub);
					});
				} else {
					if (body.data.children.length > 0) {
						logger.debug('Finding posts before post ' + body.data.children[body.data.children.length-1].data.title);
						getRedditImage(user, channel, sub, body.data.children[body.data.children.length-1].data.name);
					} else {
						channel.send("I have ran out of images to show you <:feelssad:445577555857113089>");
					}
				}
			});
		} else {
			channel.send("No images were found <:feelsdumb:445570808472141834>");
		}
	})
}

var helpMessage = `:robot: Current commands: :robot:  
\`reddit [subreddit]\`: gets a random link from the given subreddit 
\`emoji\`: turns your message into emojis 
\`word [word]\`: shows how many times a word is used in the current channel
\`word [word] ? \`: shows how many times a word is used in the current channel per user
\`word @user [word]\`: shows how many times a word is used in the current channel by the mentioned user
\`count\`: counts messages in the current channel
\`count @user\`: counts messages in the current channel from the mentioned user
\`top\`: shows the top 10 messages in the current channel
\`top @user\`: shows the top 10 messages in the current channel from the mentioned user
\`emotes\`: shows the top 10 emotes in the current channel
\`emotes @user\`: shows the top 10 emotes in the current channel from the mentioned user
\`delete \`:deletes the last message from you
\`ping\`: prints the current ping of the bot and the API
\`Current Version\`: ` + package.versionname + '-' + package.version;

var farmHelpMessage = `:seedling: Current commands for farming: :seedling:  
\`farm\`: shows how your good boy point farm is doing
\`farm @person\`: shows how @person's good boy point farm is doing
\`farm harvest\`: harvest your good boy points
\`farm upgrade\`: give some points to upgrade your plants to produce one more point per plant
\`farm seed\`: give some points to plant an extra plant on your farm
\`farm info\`: displays information about your farm including upgrade costs and grow time
\`farm rename\`: renames your farm (format "[username]'s [farm name] farm")
\`farm fence\`: upgrades your fencing to a higher level`;