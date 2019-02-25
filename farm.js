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
	
	this.owner = message.author;
						
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
Cost to seed: ${this.seedcost} point(s)
Your total: ${this.points} point(s)`)
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

		this.points += gain;
		this.growth = 0;
		this.ungrown = this.cropyield
		this.planted_at = new Date();
		this.save(true);
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
	else if(this.cropyield > 30)
	{
		message.channel.send('Your farm is fully seeded');
	}
	else 
	{
		this.cropyield++;
		this.points -= this.seedcost;
		
		this.save();
		message.channel.send(`You spend ${this.seedcost} point(s) and now have ${this.cropyield} amount of crops`)
		this.print(message);
	}
}

Farm.prototype.upgrade = async function(message) {
	await this.promise;
	
	if(this.points < this.upgradecost)
	{
		message.channel.send('You dont have the required ' + this.upgradecost + ' point(s) to upgrade your farm');
	}
	else if(this.tier > 20)
	{
		message.channel.send('Your farm is fully upgraded');
	}
	else 
	{
		this.tier++;
		this.points -= this.upgradecost;
		
		this.save();
		message.channel.send(`You spend ${this.upgradecost} point(s) and now have tier ${this.tier} crops`)
		this.print(message);
	}
}

Farm.prototype.save = async function(set_planted = false) {
	await this.promise;
	
	var editfarm;
	
	if(!set_planted)
		editfarm = db.prepare('UPDATE farm SET yield = ?, tier = ?, points = ? WHERE user_id = ?', [this.cropyield, this.tier, this.points, this.owner.id]);
	else
		editfarm = db.prepare('UPDATE farm SET yield = ?, tier = ?, points = ?, planted_at = ? WHERE user_id = ?', [this.cropyield, this.tier, this.points, this.planted_at, this.owner.id]);

	editfarm.run(function(err){				
		if(err)
		{
			logger.error("failed to update: farm for user " + this.owner.username);
			logger.error(err);
		}
		else
		{
			logger.log('debug', "updated: farm for user " + this.owner.username); 
		}
	}.bind(this));
}


// Farm.prototype.func_name = async function(message) {
//	await this.promise;
// }