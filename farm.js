var logger = require('winston');
var moment = require('moment');
const sqlite3 = require('sqlite3');

var emoji = require('./emoji.json');
var db = new sqlite3.Database("./discord.db")


module.exports = {
    init: function(message) {
        var farm = new Farm(message)
        return farm
    }
}

function Farm(message) {
	let selectSQL = 'SELECT * FROM farm WHERE user_id = ' + message.author.id;
	
	this.user = message.author;
						
	logger.info(selectSQL);
	
	this.promise = new Promise((resolve, reject) => {	
		db.get(selectSQL, [], (err, row) => {
			if (err) {
				throw err;
				reject();
			}
			
			if(!row)
			{
				create(message);
				
				resolve();
			}
			
			if(row)
			{
				this.planted_at = moment(row["planted_at"]);
				var timepassed = moment.duration(moment().diff(this.planted_at));
				
				this.time = row['time'];
				this.cropyield = row['yield'];
				this.tier = row['tier']
				this.points = row['points']
				
				this.growth = timepassed.asMilliseconds()/this.time;
				this.growth = Math.floor(this.growth)
				
				if(this.growth > this.cropyield)
				{
					this.growth = this.cropyield;
				}
				this.ungrown = this.cropyield - this.growth;	
				
				this.seedcost = Math.pow(this.cropyield-2, 2);
				this.upgradecost = Math.pow(this.tier + 1, 2);
				
				resolve();
			}
		});
	});
}

Farm.prototype.create = function(message) {
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
			
			
			this.planted_at = new Date();
			var timepassed = moment.duration(moment().diff(this.planted_at));
			
			this.time = 5 * 60 * 1000
			this.cropyield = 3
			this.tier = 0
			
			this.growth = timepassed.asMilliseconds()/this.time;
			this.growth = 0
			this.ungrown = this.cropyield
			
			this.seedcost = Math.pow(this.cropyield-2, 2);
			this.upgradecost = Math.pow(this.tier + 1, 2);
		}
	});
}

Farm.prototype.print = async function(message) {
	await this.promise;
	
	var result = "[";
	
	result += emoji['farm_tier_' + this.tier].repeat(this.growth);
	result += emoji.seedling.repeat(this.ungrown);
	result += ']';
	
	message.channel.send('Your good boy point farm: ')
	message.channel.send(result)
};

Farm.prototype.info = async function(message) {
	await this.promise;
	
	var result = "[";
	
	result += emoji['farm_tier_' + this.tier].repeat(this.growth);
	result += emoji.seedling.repeat(this.ungrown);
	result += ']';
	
	var timeinmin = moment.duration(this.time).asMinutes()

	message.channel.send('Your good boy point farm: ')
	message.channel.send(result)
	message.channel.send(`Time to grow 1 crop: ${timeinmin}min
Tier: ${this.tier} ${emoji['farm_tier_' + this.tier]}
Cost to upgade: ${this.upgradecost} point(s)
Cost to seed: ${this.seedcost} point(s)`)
};

Farm.prototype.harvest = async function(message) {
	await this.promise;
	
	var result = "[";
	var afterresult = "["
	
	result += emoji['farm_tier_' + this.tier].repeat(this.growth);
	result += emoji.seedling.repeat(this.ungrown);
	afterresult += emoji.seedling.repeat(this.cropyield);
	result += ']';
	afterresult += ']';
	
	if(this.growth !== 0)
	{
		var gain = this.growth * (this.tier + 1);
		
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

Farm.prototype.seed = async function(message) {
	await this.promise;
	
	if(this.points < this.seedcost)
	{
		message.channel.send('You dont have the required ' + this.seedcost + ' point(s) to seed your farm');
	}
	else 
	{
		var currenttime = new Date();

		var editfarm = db.prepare('UPDATE farm SET yield = ?, points = points - ? WHERE user_id = ?', [++this.cropyield, this.seedcost, message.author.id]);

		editfarm.run(function(err){				
			if(err)
			{
				logger.error("failed to update: farm for user " + message.author.username);
				logger.error(err);
			}
			else
			{
				logger.log('debug', "updated: farm for user " + message.author.username); 
				message.channel.send('You spend ' + this.seedcost + ' point(s) and seeded your farm');
				this.print(message);
			}
		}.bind(this));
	}
}

Farm.prototype.upgrade = async function(message) {
	await this.promise;
	
	if(this.points < this.upgradecost && this.tier < 20)
	{
		message.channel.send('You dont have the required ' + this.upgradecost + ' point(s) to upgrade your farm');
	}
	else 
	{
		var editfarm = db.prepare('UPDATE farm SET tier = tier + 1, points = points - ? WHERE user_id = ?', [this.upgradecost, message.author.id]);

		editfarm.run(function(err){				
			if(err)
			{
				logger.error("failed to update: farm for user " + message.author.username);
				logger.error(err);
			}
			else
			{
				logger.log('debug', "updated: farm for user " + message.author.username); 
				message.channel.send('You spend ' + this.upgradecost + ' point and upgrade your farm');
				this.print(message);
			}
		}.bind(this));
	}
}

// Farm.prototype.func_name = async function(message) {
//	await this.promise;
// }























