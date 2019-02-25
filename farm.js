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
			}
			
			if(!row)
			{
				// no farm? 
			}
			
			if(row)
			{
				this.planted_at = moment(row["planted_at"]);
				var timepassed = moment.duration(moment().diff(this.planted_at));
				
				this.time = row['time'];
				this.cropyield = row['yield'];
				this.tier = row['tier']
				
				this.growth = timepassed.asMilliseconds()/this.time;
				this.growth = Math.floor(this.growth)
				
				if(this.growth > this.cropyield)
				{
					this.growth = this.cropyield;
				}
				this.ungrown = this.cropyield - this.growth;	
				resolve();
			}
		});
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