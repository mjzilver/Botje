var logger = require('winston');
var moment = require('moment');
const sqlite3 = require('sqlite3');

var emoji = require('./emoji.json');
var db = new sqlite3.Database("./discord.db")


module.exports = {
    init: function(user) {
        var farm = new Farm(user)
        return farm
    }
}

function Farm(user) {
	let selectSQL = 'SELECT * FROM farm WHERE user_id = ' + user.id;
	
	this.owner = user;
						
	logger.info(selectSQL);
	
	this.promise = new Promise((resolve, reject) => {	
		db.get(selectSQL, [], (err, row) => {
			if (err) {
				throw err;
				reject();
			}
			
			if(!row)
			{
				create(user);
				
				resolve();
			}
			
			if(row)
			{
				this.planted_at = moment(row["planted_at"]);
				
				this.time = row['time'];
				this.cropyield = row['yield'];
				this.tier = row['tier']
				this.points = row['points']
				
				resolve();
			}
		});
	});
}

Farm.prototype.seedcost = function(message) {
	return Math.pow(this.cropyield - 2, 2);
}

Farm.prototype.upgradecost = function(message) {
	return Math.pow(this.tier + 1, 2)
}

Farm.prototype.growth = function(message) {
	var timepassed = moment.duration(moment().diff(this.planted_at));
	var grownplants = timepassed.asMilliseconds()/this.time;
	
	grownplants = Math.floor(grownplants)
				
	if(grownplants > this.cropyield)
	{
		grownplants = this.cropyield;
	}
	return grownplants;
}

Farm.prototype.ungrown = function(message) {
	return this.cropyield - this.growth();
}


Farm.prototype.create = function(user) {
	var insert = db.prepare('INSERT INTO farm (user_id, yield, time, planted_at) VALUES (?,?,?,?)', user.id, 3, 5 * 60 * 1000, new Date())

	insert.run(function(err){				
		if(err)
		{
			logger.error("failed to insert: farm for user " + user.username);
			logger.error(err);
		}
		else
		{
			logger.log('debug', "inserted: farm for user " + user.username);   
			
			
			this.planted_at = new Date();
			
			this.time = 5 * 60 * 1000
			this.cropyield = 3
			this.tier = 0
		}
	});
}

Farm.prototype.print = async function(channel) {
	await this.promise;
	
	var result = "[";
	
	result += emoji['farm_tier_' + this.tier].repeat(this.growth());
	result += emoji.seedling.repeat(this.ungrown());
	result += ']';
	
	channel.send('Your good boy point farm: ')
	channel.send(result)
};

Farm.prototype.info = async function(channel) {
	await this.promise;
	
	var result = "[";
	
	result += emoji['farm_tier_' + this.tier].repeat(this.growth());
	result += emoji.seedling.repeat(this.ungrown());
	result += ']';
	
	var timeinmin = moment.duration(this.time).asMinutes()

	channel.send('Your good boy point farm: ')
	channel.send(result)
	channel.send(`Time to grow 1 crop: ${timeinmin}min
Tier: ${this.tier} ${emoji['farm_tier_' + this.tier]}
Cost to upgade: ${this.upgradecost()} point(s)
Cost to seed: ${this.seedcost()} point(s)
Your total: ${this.points} point(s)`)
};

Farm.prototype.harvest = async function(channel) {
	await this.promise;
	
	var result = "[";
	var afterresult = "["
	
	result += emoji['farm_tier_' + this.tier].repeat(this.growth());
	result += emoji.seedling.repeat(this.ungrown());
	afterresult += emoji.seedling.repeat(this.cropyield);
	result += ']';
	afterresult += ']';
	
	if(this.growth() !== 0)
	{
		var gain = this.growth() * (this.tier + 1);
		
		channel.send('Your good boy point farm before: ')
		channel.send(result)
		channel.send('Your good boy point farm after: ')
		channel.send(afterresult)
		channel.send('You gained ' + gain + ' good boy point(s)')

		this.points += gain;
		this.planted_at = new Date();
		this.save(true);
	} 
	else 
	{
		channel.send('Your good boy point farm: ')
		channel.send(result)
	}
}

Farm.prototype.seed = async function(channel) {
	await this.promise;
	
	if(this.points < this.seedcost())
	{
		channel.send('You dont have the required ' + this.seedcost() + ' point(s) to seed your farm');
	}
	else if(this.cropyield > 30)
	{
		channel.send('Your farm is fully seeded');
	}
	else 
	{
		this.cropyield++;
		this.points -= this.seedcost();
		
		this.save();
		channel.send(`You spend ${this.seedcost()} point(s) and now have ${this.cropyield} crop growing`)
		this.print(channel);
	}
}

Farm.prototype.upgrade = async function(channel) {
	await this.promise;
	
	if(this.points < this.upgradecost())
	{
		channel.send('You dont have the required ' + this.upgradecost() + ' point(s) to upgrade your farm');
	}
	else if(this.tier > 20)
	{
		channel.send('Your farm is fully upgraded');
	}
	else 
	{
		this.tier++;
		this.points -= this.upgradecost();
		
		this.save();
		channel.send(`You spend ${this.upgradecost()} point(s) and now have tier ${this.tier} crops`)
		this.print(channel);
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

// easy to copy for extra functions
// Farm.prototype.func_name = async function(message) {
//	await this.promise;
// }