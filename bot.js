var Discord = require('discord.js');
var winston = require('winston');
var fs = require('fs');
var request = require('request');
var moment = require('moment');
const sqlite3 = require('sqlite3');

var auth = require('./auth.json');
var package = require('./package.json');
var emoji = require('./emoji.json');
var db = new sqlite3.Database("./discord.db")
const { prefix } = require('./config.json');

// person as key -> message as value
var imagesSent = [];

// Configure logger settings
var logger = new (winston.Logger)({
    transports: [
        new (winston.transports.Console)({
            colorize: true,
            level: 'debug'
        }),
        new (winston.transports.File)({
            filename: 'bot.log',
            level: 'debug'
        })
    ]
});

// Initialize Discord Bot
var bot = new Discord.Client({autoReconnect:true});
bot.commands = new Discord.Collection();

bot.on('ready', () => {
    logger.info('Connected');
    logger.info(`Logged in as: ${bot.user.username} - ${bot.user.id}`);
});

bot.login(auth.token);

bot.on('error', function (error) {
	logger.error(error);
});

process.on('uncaughtException', function (error) {
   logger.error(error);
});

bot.on('message', message => {
	var channel = message.channel
	
    // look for the b! meaning bot command
    if (message.content.match(new RegExp(prefix,"i"))) {
		message.content = message.content.replace(new RegExp(prefix,"i"), '');
       	const args = message.content.split(' ');
		const command = args.shift().toLowerCase();
		
		logger.log('debug', message.author.username + ' requested ' + command + ' with arguments ' + args);

        switch(command) {
            case 'help':
				channel.send(helpMessage);
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
            default:
			break;
        }
    }
})

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

function farm(message, arguments)
{
	switch(arguments[0]) {
		case 'harvest':
			harvestfarm(message)
		break;
		case 'seed':
			seedfarm(message)
		break;
		case 'upgrade':
			upgradefarm(message)
		break;
		default:
			printfarm(message)
		break;
	}
}

function harvestfarm(message)
{
	let selectSQL = 'SELECT * FROM farm WHERE user_id = ' + message.author.id;
						
	logger.info(selectSQL);
				
	db.get(selectSQL, [], (err, row) => {
		if (err) {
			throw err;
		}
		
		if(!row)
		{
			message.channel.send('You do not have a farm. Create a farm with command farm ');
		}
		
		if(row)
		{			
			var planted_at = moment(row["planted_at"]);
			timepassed = moment.duration(moment().diff(planted_at));
			
			var time = row['time'];
			var yield = row['yield'];
			var tier = row['tier']
			var points = row['points']
			var growth = timepassed.asMilliseconds()/time;
			growth = Math.floor(growth)
			
			if(growth > yield)
			{
				growth = yield;
			}
			var ungrown = yield - growth;
			
			var result = "[";
			var afterresult = "["
			
			result += emoji['farm_tier_' + tier].repeat(growth);
			result += emoji.seedling.repeat(ungrown);
			afterresult += emoji.seedling.repeat(yield);
			result += ']';
			afterresult += ']';
			
			if(growth !== 0)
			{
				var gain = growth * (tier + 1);
				
				message.channel.send('Your good boy point farm before: ')
				message.channel.send(result)
				message.channel.send('Your good boy point farm after: ')
				message.channel.send(afterresult)
				message.channel.send('You gained ' + gain + ' good boy point(s)')
				
				var currenttime = new Date();
				var editfarm = db.prepare('UPDATE farm SET planted_at = ?, points = points + ? WHERE user_id = ?', [currenttime, gain, message.author.id]);

				editfarm.run(function(err){				
					if(err)
					{
						logger.error("failed to update: farm for user " + message.author.username);
						logger.error(err);
					}
					else
					{
						logger.log('debug', "updated: farm for user " + message.author.username);   
					}
				});
			} 
			else 
			{
				message.channel.send('Your good boy point farm: ')
				message.channel.send(result)
			}
		}
	});
}

function seedfarm(message)
{
	let selectSQL = 'SELECT * FROM farm WHERE user_id = ' + message.author.id;
						
	logger.info(selectSQL);
				
	db.get(selectSQL, [], (err, row) => {
		if (err) {
			throw err;
		}
		
		if(!row)
		{
			message.channel.send('You do not have a farm. Create a farm with command farm ');
		}
		
		if(row)
		{
			var costs = Math.pow(row['yield']-2, 2);
			if(row['points'] < costs)
			{
				message.channel.send('You dont have the required ' + costs + ' point(s) to seed your farm');
			}
			else 
			{
				var yield = row['yield']
				var currenttime = new Date();

				var editfarm = db.prepare('UPDATE farm SET yield = ?, points = points - ? WHERE user_id = ?', [++yield, costs, message.author.id]);

				editfarm.run(function(err){				
				if(err)
				{
					logger.error("failed to update: farm for user " + message.author.username);
					logger.error(err);
				}
				else
				{
					logger.log('debug', "updated: farm for user " + message.author.username); 
					message.channel.send('You spend ' + costs + ' point and seeded your farm');
					printfarm(message);
					
					var insertrep = db.prepare('DELETE reputation (user_id, target_user_id, date) VALUES (?, ?, ?)', [bot.user.id, message.author.id, currenttime]);
			
					insertrep.run(function(err){				
						if(err)
						{
							logger.error("failed to insert: good boy points for user " + message.author.username);
							logger.error(err);
						}
						else
						{
							logger.log('debug', "inserted: good boy points for user " + message.author.username);   
						}
					});
				}
				});
			}
		}
	});
}

function upgradefarm(message)
{
	let selectSQL = 'SELECT * FROM farm WHERE user_id = ' + message.author.id;
						
	logger.info(selectSQL);
				
	db.get(selectSQL, [], (err, row) => {
		if (err) {
			throw err;
		}
		
		if(!row)
		{
			message.channel.send('You do not have a farm. Create a farm with command farm ');
		}
		
		if(row)
		{
			var costs = Math.pow(row['tier'] + 1, 2);
			if(row['points'] < costs && row['tier'] < 20)
			{
				message.channel.send('You dont have the required ' + costs + ' point(s) to upgrade your farm');
			}
			else 
			{
				var editfarm = db.prepare('UPDATE farm SET tier = tier + 1, points = points - ? WHERE user_id = ?', [costs, message.author.id]);

				editfarm.run(function(err){				
				if(err)
				{
					logger.error("failed to update: farm for user " + message.author.username);
					logger.error(err);
				}
				else
				{
					logger.log('debug', "updated: farm for user " + message.author.username); 
					message.channel.send('You spend ' + costs + ' point and upgrade your farm');
					printfarm(message);
					
					var insertrep = db.prepare('DELETE reputation (user_id, target_user_id, date) VALUES (?, ?, ?)', [bot.user.id, message.author.id, currenttime]);
			
					insertrep.run(function(err){				
						if(err)
						{
							logger.error("failed to insert: good boy points for user " + message.author.username);
							logger.error(err);
						}
						else
						{
							logger.log('debug', "inserted: good boy points for user " + message.author.username);   
						}
					});
				}
				});
			}
		}
	});
}

function printfarm(message)
{
	let selectSQL = 'SELECT * FROM farm WHERE user_id = ' + message.author.id;
						
	logger.info(selectSQL);
				
	db.get(selectSQL, [], (err, row) => {
		if (err) {
			throw err;
		}
		
		if(!row)
		{
			var insert = db.prepare('INSERT INTO farm (user_id, yield, time, planted_at) VALUES (?,?,?,?)', message.author.id, 3, 5 * 60 * 1000, new Date())
			
			insert.run(function(err){				
				if(err)
				{
					logger.error("failed to insert: farm for user " + message.author.username);
					logger.error(err);
				}
				else
				{
					logger.log('debug', "inserted: farm for user " + message.author.username);   
					printfarm(message);
				}
			});
		}
		
		if(row)
		{
			var planted_at = moment(row["planted_at"]);
			timepassed = moment.duration(moment().diff(planted_at));
			
			var time = row['time'];
			var yield = row['yield'];
			var tier = row['tier']
			
			var growth = timepassed.asMilliseconds()/time;
			growth = Math.floor(growth)
			
			if(growth > yield)
			{
				growth = yield;
			}
			var ungrown = yield - growth;
			
			var result = "[";
			
			result += emoji['farm_tier_' + tier].repeat(growth);
			result += emoji.seedling.repeat(ungrown);
			result += ']';
			
			message.channel.send('Your good boy point farm: ')
			message.channel.send(result)
		}
	});
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
			'Authorization': 'Client-ID ' + auth.imgur
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
\`award @[person]\`: gives good boy points to a person (does not cost points)
\`farm\`: shows how your good boy point farm is doing
\`farm harvest\`: harvest your good boy points
\`farm upgrade\`: give 1 good boy point to make your farm produce 20% faster
\`farm seed\`: give 1 good boy point to make your farm produce twice as much
\`submit\`: submit an idea for a new feature 
\`delete \`:deletes the last message from you
\`ping\`: prints the current ping of the bot and the API
\`Current Version\`: ` + package.version;