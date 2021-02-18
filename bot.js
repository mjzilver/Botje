class Bot {
	constructor() {
		this.commands = require('./commands.js');
		this.admincommands = require('./admincommands.js');
		
		// person as key -> time as value
		this.lastRequest = [];
		// adding the timer (so the timeout stacks)
		this.lastRequestTimer = [];

		this.messageCounter = 0;
		this.lastMessageSent = new Date();
	
		this.bot = new discord.Client({
			autoReconnect: true
		})
	
		this.bot.on('ready', () => {
			this.bot.user.setPresence({ activity: { name: `Running Version ${global.package.version}` }})
			logger.info('Connected');
			logger.info(`Logged in as: ${this.bot.user.username} - ${this.bot.user.id}`);
			logger.info(`Running Version ${global.package.versionname} - ${global.package.version}`);
		});

		this.bot.login(config.discord_api_key);

		this.bot.on('error', function (error) {
			logger.error(error.message);
		});

		this.bot.on('message', message => {
			database.storemessage(message);
			var currentTimestamp = new Date();

			// look for the b! meaning bot command
			if (message.content.match(new RegExp(config.prefix, "i")) && !message.author.equals(bot.user)) {
				message.content = message.content.replace(new RegExp(config.prefix, "i"), '');
				message.content = message.content.normalizeSpaces()
				const args = message.content.split(' ');
				const command = args.shift().toLowerCase();
				var allowed = true;

				if (!(message.author.username in this.lastRequest) || message.member.hasPermission("ADMINISTRATOR")) {
					this.lastRequest[message.author.username] = currentTimestamp;
				} else {
					// set timer
					this.lastRequestTimer[message.author.username] = (message.author.username in this.lastRequestTimer) ? this.lastRequestTimer[message.author.username] : 5;
					var currentTimer = this.lastRequestTimer[message.author.username];

					if ((currentTimestamp - this.lastRequest[message.author.username] < (currentTimer * 1000))) {
						this.lastRequestTimer[message.author.username] = currentTimer + 5;

						var difference = new Date(currentTimestamp.getTime() - this.lastRequest[message.author.username].getTime());
						if (currentTimer == 5)
							message.channel.send('You need to wait ' + (currentTimer - difference.getSeconds()) + ' seconds')
						else
							message.channel.send('You need to wait ' + (currentTimer - difference.getSeconds()) + ' seconds, added 5 seconds because you didnt wait')

						allowed = false;
					} else {
						this.lastRequestTimer[message.author.username] = 5;
						this.lastRequest[message.author.username] = currentTimestamp;
					}
				}

				logger.log('debug', `'${message.author.username}' issued '${command}' with arguments '${args}' in channel '${message.channel.name}' in server '${message.channel.guild.name}'`);

				if(allowed)
					if(command in this.commands)
						return this.commands[command](message);

				if(message.author.id === config.owner)
					if(command in this.admincommands)
						return this.admincommands[command](message);
			} 

			if(!message.author.bot) {
				var timepassed = new Date(currentTimestamp.getTime() - this.lastMessageSent.getTime()).getMinutes();

				if((this.messageCounter >= config.speakEvery && timepassed >= 10) || message.content.match(new RegExp(/\bbot(je)?\b/, "gi"))) {
					this.commands['speak'](message);
					this.lastMessageSent = currentTimestamp;
					this.messageCounter = 0;
				}
				this.messageCounter++;
			}
		})

		this.bot.on('messageDelete', message => {
			logger.log('warn', `This Message has been deleted: ${message.author.username}: ${message.content} == Send at: ${new Date(message.createdTimestamp).toUTCString()}`);

			if(message.edits.length > 1)
			{
				message.edits.forEach(edit => {
					logger.log('warn', `This edit belongs to ${message.author.username}: ${message.content} == Edit at: ${edit.content}  ${new Date(message.editedTimestamp).toUTCString()}`);
				});
			}
		})
	}	
}
module.exports = new Bot();