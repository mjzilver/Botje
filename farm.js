var moment = require('moment');
const sqlite3 = require('sqlite3');

var emoji = require('./emoji.json');
var db = new sqlite3.Database("./discord.db")

// Configure logger settings
var logger = require('winston').loggers.get('logger');

var fence_left = {
	"0" : ":",
	"1" : "|",
	"2" : "<",
	"3" : "(",
	"4" : "{",
	"5" : "["
}

var fence_right = {
	"0" : ":",
	"1" : "|",
	"2" : ">",
	"3" : ")",
	"4" : "}",
	"5" : "]"
}

module.exports = {
    init: function(user) {
        var farm = new Farm(user)
        return farm
    }
}

function Farm(user) {
	let selectSQL = 'SELECT * FROM farm WHERE user_id = ' + user.id;
	
	this.owner = user;
						
	this.promise = new Promise((resolve, reject) => {	
		db.get(selectSQL, [], (err, row) => {
			if (err) {
				throw err;
				reject();
			}
			
			if(!row)
			{
				this.create(user);
				
				resolve();
			}
			
			if(row)
			{
				this.planted_at = moment(row["planted_at"]);
				
				this.id = row['id'];
				this.user_id = row['user_id']
				this.time = row['time'];
				this.cropyield = row['yield'];
				this.tier = row['tier']
				this.points = row['points']
				this.farmname = row['farmname']
				this.fence_tier = row['fence_tier']
								
				if(!this.farmname)
					this.farmname = "good boy points"
				
				logger.info(`Accessed Farm ::: user ${this.owner.username}, farm name ${this.farmname}, points ${this.points}, tier ${this.tier}, yield ${this.cropyield}, fence tier ${this.fence_tier}`)
				
				resolve();
			}
		});
	});
}

Farm.prototype.seedcost = function() {
	return Math.pow(this.cropyield - 2, 2);
}

Farm.prototype.upgradecost = function() {
	return Math.pow(this.tier + 1, 2)
}

Farm.prototype.fencecost = function() {
	return (this.fence_tier+1) * 25;
}

Farm.prototype.getseed = function() {
	if(this.tier <= 20)
		return emoji.seedling
	else if (this.tier > 20)
		return emoji.egg
}

Farm.prototype.growth = function() {
	var timepassed = moment.duration(moment().diff(this.planted_at));
	var grownplants = timepassed.asMilliseconds()/this.time;
	
	grownplants = Math.floor(grownplants)
				
	if(grownplants > this.cropyield)
	{
		grownplants = this.cropyield;
	}
	return grownplants;
}

Farm.prototype.ungrown = function() {
	return this.cropyield - this.growth();
}

Farm.prototype.editnickname = async function(channel, name) {
	await this.promise;
	
	if(name)
	{
		if(name.length > 30)
		{
			channel.send(`You chosen name is too long`)
		}
		else 
		{
			var oldname = this.farmname
			this.farmname = name
			
			channel.send(`Changed your farm's name from: ${oldname} to ${this.farmname}`)
			
			this.save();
		}
	} 
	else 
	{
		channel.send(`You need to input a name`)
	}
}

Farm.prototype.create = function(user) {
	var insert = db.prepare('INSERT INTO farm (user_id, points, tier, fence_tier, yield, time, planted_at) VALUES (?,?,?,?,?,?,?)', user.id, 1, 1, 1, 3, 5 * 60 * 1000, new Date())

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
			this.points = 0
			this.fence_tier = 0
		}
	});
}

Farm.prototype.display = function() {
	var result = fence_left[this.fence_tier];
	
	result += emoji['farm_tier_' + this.tier].repeat(this.growth());
	result += this.getseed().repeat(this.ungrown());
	result += fence_right[this.fence_tier];

	return result;
}


Farm.prototype.print = async function(channel, extramessage = "") {
	await this.promise;
	
	var result = this.display()
	
	channel.send(`${this.owner.username}'s ${this.farmname} farm${extramessage}: `)
	channel.send(result)
};

Farm.prototype.info = async function(channel) {
	await this.promise;
	
	await this.print(channel);
	
	var timeinmin = this.time / 60 / 1000;

	channel.send(`Time to grow 1 crop: ${timeinmin}min
Tier: ${this.tier} ${emoji['farm_tier_' + this.tier]}
Fence protection: ${this.fence_tier * 10}% protection
Cost to upgrade: ${this.upgradecost()} point(s)
Cost to seed: ${this.seedcost()} point(s)
Cost to upgrade fence: ${this.fencecost()} point(s)
Total: ${this.points} point(s)`)
};

Farm.prototype.harvest = async function(channel) {
	await this.promise;
	
	await this.print(channel, " before");
	
	if(this.growth() !== 0)
	{
		var gain = this.growth() * (this.tier + 1);
		
		this.points += gain;
		this.planted_at = new Date();
		await this.save(true);
		await this.print(channel, " after");
		
		channel.send(`You gained ${gain} good boy point(s)`)
	} 
	else 
	{
		channel.send(`${this.owner.username}'s ${this.farmname} farm: `)
		channel.send(result)
	}
}

Farm.prototype.upgradefence = async function(channel) {
	await this.promise;
	
	if(this.points < this.fencecost())
	{
		channel.send(`You dont have the required ${this.fencecost()} point(s) to upgrade your farm's fence`);
	}
	else if(this.fence_tier >= 5)
	{
		channel.send('Your fence is fully upgraded');
	}
	else 
	{
		this.points -= this.fencecost();
		
		channel.send(`You spend ${this.fencecost()} point(s) and now a ${this.fence_tier + 1} tier fence`)
		
		this.print(channel);
		this.fence_tier++;
		this.save();
	}
}

Farm.prototype.seed = async function(channel) {
	await this.promise;
	
	if(this.points < this.seedcost())
	{
		channel.send('You dont have the required ' + this.seedcost() + ' point(s) to seed your farm');
	}
	else if(this.cropyield >= 50)
	{
		channel.send('Your farm is fully seeded');
	}
	else 
	{
		this.points -= this.seedcost();
		
		channel.send(`You spend ${this.seedcost()} point(s) and now have ${this.cropyield + 1} crop growing`)
		
		this.print(channel);
		this.cropyield++;
		this.save();
	}
}

Farm.prototype.upgrade = async function(channel) {
	await this.promise;
	
	if(this.points < this.upgradecost())
	{
		channel.send('You dont have the required ' + this.upgradecost() + ' point(s) to upgrade your farm');
	}
	else if(this.tier >= 75)
	{
		channel.send('Your farm is fully upgraded');
	}
	else 
	{
		this.points -= this.upgradecost();
		
		channel.send(`You spend ${this.upgradecost()} point(s) and now have tier ${this.tier + 1} crops`)
		
		this.print(channel);
		this.tier++;
		this.save();
	}
}
Farm.prototype.toJSON = async function() {
	await this.promise;
	return this;
}


Farm.prototype.save = async function(set_planted = false) {
	await this.promise;
	
	logger.info(`Updated Farm ::: user ${this.owner.username}, farm name ${this.farmname}, points ${this.points}, tier ${this.tier}, yield ${this.cropyield}, fence tier ${this.fence_tier}`)

	var editfarm;
	
	if(!set_planted)
		editfarm = db.prepare('UPDATE farm SET farmname = ?, yield = ?, tier = ?, points = ?, fence_tier = ? WHERE user_id = ?', [this.farmname, this.cropyield, this.tier, this.points, this.fence_tier, this.owner.id]);
	else
		editfarm = db.prepare('UPDATE farm SET farmname = ?, yield = ?, tier = ?, points = ?, planted_at = ?, fence_tier = ? WHERE user_id = ?', [this.farmname, this.cropyield, this.tier, this.points, this.planted_at, this.fence_tier, this.owner.id]);

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

/*
 TODO features:
 
 Raiding: steal from others
 Guard: hire a guard to repel thiefs
 
 Natural disaster proc chance (every hour? 5 minutes?)
 
 Someway to reward more harvest per time
*/