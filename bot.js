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

var Farm = require("./farm")

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
		selectedfarm.print(channel, false)
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
\`farm\`: shows how your good boy point farm is doing
\`farm harvest\`: harvest your good boy points
\`farm upgrade\`: give some points to upgrade your plants to produce one more point per plant
\`farm seed\`: give some points to plant an extra plant on your farm
\`farm info\`: displays information about your farm including upgrade costs and grow time
\`submit\`: submit an idea for a new feature 
\`delete \`:deletes the last message from you
\`ping\`: prints the current ping of the bot and the API
\`Current Version\`: ` + package.version;