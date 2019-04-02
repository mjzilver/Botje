var Discord = require('discord.js');
var PNGImage = require('pngjs-image');
var request = require('request');
const sqlite3 = require('sqlite3');
var logger = require('winston').loggers.get('logger');

var dev = false;
if(dev)
	var config = require('./devconfig.json');
else 
	var config = require('./config.json');

var package = require('./package.json');
var emoji = require('./emoji.json');
var db = new sqlite3.Database("./discord.db")

var Farm = require("./farm")

// person as key -> message as value
var imagesSent = [];

var maxImageSize = 250;

// Initialize Discord Bot
var bot = global.bot

bot.on('ready', () => {
    logger.info('Connected');
    logger.info(`Logged in as: ${bot.user.username} - ${bot.user.id}`);
	initializeDatabase();
});

bot.login(config.token);

bot.on('error', function (error) {
	logger.error(error);
});

bot.on('message', message => {
	var channel = message.channel
	
    // look for the b! meaning bot command
    if (message.content.match(new RegExp(config.prefix,"i"))) {
		message.content = message.content.replace(new RegExp(config.prefix,"i"), '');
       	const args = message.content.split(' ');
		const command = args.shift().toLowerCase();
		
		logger.log('debug', message.author.username + ' requested ' + command + ' with arguments ' + args);

        switch(command) {
            case 'help':
				helpFunction(channel, args[0])
			break;
			case 'image':
                getImage(message.author.username, channel, args[0]);
            break;
			case 'dog':
				getDogPicture(channel, args[0]);
            break;
			case 'submit':
				submitIdea(message.author.username, channel, args);
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
				draw(message, args);
			break;	
            default:
			break;
        }
    }
})

function initializeDatabase()
{
	db.run(`CREATE TABLE IF NOT EXISTS images (link TEXT PRIMARY KEY, sub TEXT)`)
	db.run(`CREATE TABLE IF NOT EXISTS idea (id INTEGER PRIMARY KEY AUTOINCREMENT, user TEXT, idea TEXT)`)
	db.run(`CREATE TABLE IF NOT EXISTS farm (user_id TEXT PRIMARY KEY UNIQUE, yield INTEGER, tier INTEGER, fence_tier INTEGER, time INTEGER, points INTEGER, planted_at INTEGER)`)
	db.run(`CREATE TABLE IF NOT EXISTS colors (x INTEGER,y INTEGER,red INTEGER,green INTEGER,blue INTEGER,PRIMARY KEY(x,y))`)
}

function helpFunction(channel, arg)
{
	switch(arg) {
		case 'farm':
			channel.send(farmHelpMessage)
		break;
		default:
			channel.send(helpMessage)
		break;
	}
}

async function ping(channel, message)
{
    const m = await message.channel.send("Ping?");
    m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms. API Latency is ${Math.round(bot.ping)}ms`);
}

function getDogPicture(channel, breed = "")
{
	if(breed == "")
	{
		request('https://dog.ceo/api/breeds/image/random', { json: true }, (err, res, body) => {
		if (err) { return logger.info(err) }
			channel.send(body.message);
		});
	} 
	else 
	{
		request(`https://dog.ceo/api/breed/${breed}/images/random`, { json: true }, (err, res, body) => {
		if (err) { return logger.info(err) }
			channel.send(body.message);
		});
	}
}

function submitIdea(user, channel, idea)
{
	idea = idea.join(' ');
	if(idea.length > 0)
	{
		var insert = db.prepare('INSERT INTO idea (user, idea) VALUES (?, ?)', [user, idea]);
						
		insert.run(function(err){				
			if(err)
			{
				logger.error("failed to insert: " + idea);
				logger.error(err);
			}
			else
			{
				logger.log('debug', "inserted: " + idea);               
				channel.send('Thanks for submitting your idea <:feelsgoodman:445570504720646145>');
			}
		});
	}
}

function turnIntoEmoji(channel, sentence)
{
	sentence = sentence.join(' ');
	sentence = sentence.toLowerCase();
	var result = '';
	if(sentence.length > 0)
	{
		for (var i = 0; i < sentence.length; i++) {
			if(sentence.charAt(i) >= 'a' && sentence.charAt(i) <= 'z')
				result += emoji['letter_'+sentence.charAt(i)];
			result += ' ';
		}
	}
	channel.send(result);
}

function reactTo(message, sentence)
{
	sentence = sentence.toLowerCase();
	
	if(sentence.length > 0)
	{
		var startchar = sentence.charAt(0);
		{
			if(startchar >= 'a' && startchar <= 'z')
			{
				message.react(emoji['letter_'+startchar]).then(setTimeout(() =>
				{
					reactTo(message, sentence.substring(1));
				}, 500));
			} 
			else 
			{
				reactTo(message, sentence.substring(1));
			}
		}
	}
}

function checkPoints(message)
{	
	var mentioned_user = message.mentions.users.first();
    var member = message.guild.member(mentioned_user);

	var checkrepfor = 0;
	
	if(member)
		checkrepfor = mentioned_user;
	else
		checkrepfor = message.author

	let selectSQL = 'SELECT points FROM farm WHERE user_id = ' + checkrepfor.id;
	
	db.get(selectSQL, [], (err, row) => {
		if (err) {
			throw err;
		}
		
		if(row["points"] == null)
			message.channel.send('You dont have any good boy points');
		else
			message.channel.send(checkrepfor.username + ' has ' + row["points"] + ' good boy points');
	})
}


function draw(message, arguments)
{
	if(arguments.length == 3)
	{
		var x = arguments[0];
		var y = arguments[1];
		var color = arguments[2]
		var red = 0;
		var green = 0;
		var blue = 0;
		var validcolor = true;

		switch (color) {
			case "white":
				red = 255;
				green = 255;
				blue = 255;
			break;
			case "gray":
				red = 128;
				green = 128;
				blue = 128;
			break;
			case "purple":
				red = 128;
				blue = 128;
			break;
			case "pink":
				red = 255;
				green = 20;
				blue = 147;
			break;
			case "brown":
				red = 139;
				green = 69;
				blue = 19;
			break;
			case "orange":
				red = 255;
				green = 140;
			break;
			case "black":
				// normal values are already black
			break;
			case "red":
				red = 255;
			break;
			case "yellow":
				red = 255;
				green = 255;
			break;
			case "green":
				green = 255;
			break;
			case "blue":
				blue = 255;
			break;
		
			default:
				validcolor = false;
			break;
		}

		if(x < maxImageSize && y < maxImageSize && validcolor)
		{
			var insert = db.prepare('INSERT OR REPLACE INTO colors (x, y, red, green, blue) VALUES (?, ?, ?, ?, ?)', [x, y, red, green, blue]);
							
			insert.run(function(err){				
				if(err)
					logger.error("failed to insert pixel at " + x + "-" + y);
				else
				{
					logger.info("Inserted pixel at " + x + "-" + y);
					global.io.emit('pixelChanged', {x: x, y: y, red: red, green: green, blue: blue});
					renderImage(message)
				}
			});
		} else
		{
			if(!validcolor)
				message.channel.send('Invalid color');
			else
				message.channel.send('Invalid pixel');
		}
	}
	else{
		renderImage(message)
	}
}

function renderImage(message)
{
	var image = PNGImage.createImage(maxImageSize, maxImageSize);
	image.fillRect(0, 0, maxImageSize, maxImageSize, { red:255, green:255, blue:255, alpha:255 })

	let selectSQL = 'SELECT * FROM colors';

	db.all(selectSQL, [], async (err, rows) => {
		if (err) {
			throw err;
		}
		for (var i = 0; i < rows.length; i++) {
			image.setAt(rows[i].x, rows[i].y, { red:rows[i].red, green:rows[i].green, blue:rows[i].blue, alpha:255 });
		}

		image.writeImage('./images/image.png', function (err) {
			if (err) 
			{
				throw err;
			}
			logger.info('written image')	
			message.channel.send("Current image", { files: ["./images/image.png"] });
		});
	});
}

function farm(message, arguments)
{
	var mentioned_user = message.mentions.users.first();
    var member = message.guild.member(mentioned_user);
	
	var channel = message.channel
	
	if(!member)
	{
		var selectedfarm = Farm.init(message.author);
		
		switch(arguments[0]) {
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
	} 
	else 
	{
		var selectedfarm = Farm.init(mentioned_user);
		
		switch(arguments[1]) {
			case 'info':
				selectedfarm.info(channel)
			break;
			default:
				selectedfarm.print(channel)
			break;
		}
	}
}

function prune(user, amount = 1)
{
	if(imagesSent[user])
	{
		imagesSent[user].delete().then(logger.log('warn', "deleted: " + imagesSent[user].content));
		delete imagesSent[user];
	}
}

function getImage(user, channel, sub, page = 0)
{
	const options = {
		//https://api.imgur.com/3/gallery/r/{{subreddit}}/{{sort}}/{{window}}/{{page}}
		url: 'https://api.imgur.com/3/gallery/r/'+sub+'/hot/day/' + page,
		headers: {
			'Authorization': 'Client-ID ' + config.imgur
		},
		json: true
	};
	
	request(options, (err, res, body) => {
	if (err) { return logger.info(err) }	
		if(typeof(body) !== 'undefined' && typeof(body.data) !== 'undefined' && typeof(body.data[0]) !== 'undefined')	
		{				
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
				
				for(var i = 0; i < body.data.length; i ++)
				{
					if(!(body.data[i].link in foundImages))
						filteredImages.push(body.data[i]);
				}
				
				if(filteredImages.length > 0)
				{
					var chosen = Math.floor(Math.random()* filteredImages.length);
					var link = filteredImages[chosen].link;

					logger.debug('Image requested from ' + sub + ' received ' + filteredImages.length + ' chosen number ' + chosen);
					
					if(filteredImages[chosen].nsfw)
						imagesSent[user] = await channel.send('||' + link + '||');
					else
						imagesSent[user] = await channel.send(link);
					
					if(filteredImages[chosen].is_album)
						logger.info(filteredImages[chosen])

					
					var insert = db.prepare('INSERT INTO images (link, sub) VALUES (?, ?)', [link, sub]);
					
					insert.run(function(err){				
						if(err)
						{
							logger.error("failed to insert: " + link);
							logger.error(err);
						}
						else
							logger.log('debug', "inserted: " + link);
					});
				} 
				else 
				{
					if(body.data.length > 0)
					{
						logger.debug(page + ' page of images used');
						getImage(user, channel, sub, ++page);
					} 
					else 
					{
						channel.send("I have ran out of images to show you <:feelssad:445577555857113089>");
					}
				}
			});
		} 
		else 
		{
			channel.send("No images were found <:feelsdumb:445570808472141834>");
		}
	});
}

var helpMessage = `:robot: Current commands: :robot:  
\`image [subreddit]\`: gets a random picture from the given subreddit 
\`emoji\`: turns your message into emojis 
\`react\`: reacts to your post with emojis using the text you posted
\`points\`: check how much good boy points you have acquired
\`help farm \`: shows help for farm commands
\`submit\`: submit an idea for a new feature 
\`delete \`:deletes the last message from you
\`ping\`: prints the current ping of the bot and the API
\`draw\`: prints the current drawing board
\`draw [x] [y] [color]\`: draws a pixel on the drawing board at [x][y] with the color (only the 12 basic colors)
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
