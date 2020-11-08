const sqlite3 = require('sqlite3');
var logger = require('winston').loggers.get('logger');

var db = new sqlite3.Database("./discord.db")

var package = require('./package.json');
var config = require('./config.json');

var commands = require('./commands.js');
var admincommands = require('./admincommands.js');

// person as key -> time as value
var lastRequest = [];
// adding the timer (so the timeout stacks)
var lastRequestTimer = [];

// Initialize Discord Bot
var bot = global.bot

bot.on('ready', () => {
	logger.info('Connected');
	logger.info(`Logged in as: ${bot.user.username} - ${bot.user.id}`);
	logger.info(`Running Version ` + package.versionname + ' - ' + package.version);

	initializeDatabase();
});

bot.login(config.token);

bot.on('error', function (error) {
	logger.error(error.message);
});

bot.on('message', message => {
	var channel = message.channel

	storemsg(message);

	// look for the b! meaning bot command
	if (message.content.match(new RegExp(config.prefix, "i")) && !message.author.equals(bot.user))  {
		message.content = message.content.replace(new RegExp(config.prefix, "i"), '');
		const args = message.content.split(' ');
		const command = args.shift().toLowerCase();

		var allowed = true;

		currentTimestamp = new Date();

		if (!(message.author.username in lastRequest) || message.member.hasPermission("ADMINISTRATOR")) {
			lastRequest[message.author.username] = currentTimestamp;
		} else {
			// set timer
			lastRequestTimer[message.author.username] = (message.author.username in lastRequestTimer) ? lastRequestTimer[message.author.username] : 5;
			currentTimer = lastRequestTimer[message.author.username];

			if ((currentTimestamp - lastRequest[message.author.username] < (currentTimer * 1000))) {
				lastRequestTimer[message.author.username] = currentTimer + 5;

				var diff = new Date(currentTimestamp.getTime() - lastRequest[message.author.username].getTime());
				if (currentTimer == 5)
					channel.send('You need to wait ' + (currentTimer - diff.getSeconds()) + ' seconds')
				else
					channel.send('You need to wait ' + (currentTimer - diff.getSeconds()) + ' seconds, added 5 seconds because you didnt wait')

				allowed = false;
			} else {
				lastRequestTimer[message.author.username] = 5;
				lastRequest[message.author.username] = currentTimestamp;
			}
		}

		logger.log('debug', message.author.username + ' requested ' + command + ' with arguments ' + args);

		if(allowed)
			if(command in commands)
				commands[command](message, db);

		// only me for now
		if(message.author.id === '265610043691499521')
			if(command in admincommands)
				admincommands[command](message, db);
	}
})

function initializeDatabase() {
	db.run(`CREATE TABLE IF NOT EXISTS images (link TEXT PRIMARY KEY, sub TEXT)`)
	db.run(`CREATE TABLE IF NOT EXISTS messages (user_id TEXT, user_name TEXT, message TEXT, date TEXT, channel TEXT, PRIMARY KEY(user_id, date, channel))`)
}

function storemsg(message) {
	if (message.content.length >= 3 && !message.author.equals(bot.user) && !message.content.match(new RegExp(config.prefix, "i"))) {
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
