var moment = require('moment');
const sqlite3 = require('sqlite3');

var emoji = require('./emoji.json');
var db = new sqlite3.Database("./discord.db")

// Configure logger settings
var winston = require('winston');

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

var Farm = require("./farm")

/*
CREATE TABLE "farm_events" (
	"id"	INTEGER NOT NULL,
	"target_id"	INTEGER,
	"user_id"	INTEGER,
	"type"	TEXT NOT NULL,
	"amount"	INTEGER,
	"started_at"	INTEGER,
	"time"	INTEGER,
	PRIMARY KEY("id","target_id")
);
*/

module.exports = {
    init: function(type, target, author, amount, repeating = 0, saveData = true) {
        var farmevent = new FarmEvent(type, target, author, amount, repeating, saveData)
        return farmevent
    }
}

function FarmEvent(type, target, author, amount, repeating, saveData) {
	this.type = type;
	this.target = target;
	this.author = author;
	this.amount = amount;
	this.repeating = repeating;
	
	if(saveData)
		this.save();
}

FarmEvent.prototype.execute = function() {
	let selectSQL = 'SELECT * FROM farm WHERE id = ' + this.target;
	
	db.get(selectSQL, [], (err, row) => {
		if (err) {
			throw err;
			reject();
		}
		if(row)
		{
			
			
			
			if(this.repeating)
			{
				this.amount--;
				if(this.amount <= 0)
				{
				this.deleteFromDatabase()
				}
			}
			else
			{
				this.deleteFromDatabase()
			}
		}
			
	});
	
	
	
};

FarmEvent.prototype.deleteFromDatabase = function() {
	var deleteEvent = db.prepare("DELETE FROM farm_events WHERE target_id = ? AND type = ?", [this.target, this.type])
	
	createEvent.run(function(err){				
		if(err)
		{
			logger.error("failed to delete event");
			logger.error(err);
		}
		else
		{
			logger.log('debug', "Deleted: farm event"); 
		}
	}.bind(this));
}

FarmEvent.prototype.save = function() {	
	var createEvent = db.prepare('INSERT OR REPLACE INTO farm_events (type, target_id, author_id, amount, repeating) VALUES (?, ?, ?, ?, ?)', [this.type, this.target, this.author, this.amount, this.repeating]);
	
	logger.info(this.type);
	logger.info(this.target);
	logger.info(this.author);
	logger.info(this.amount);
	logger.info(this.repeating);
		
	createEvent.run(function(err){				
		if(err)
		{
			logger.error("failed to save event");
			logger.error(err);
		}
		else
		{
			logger.log('debug', "Saved: farm event");
			logger.info(`Saved Farm Event ::: type ${this.type}, author ${this.author}, farm owner ${this.target}`)
		}
	}.bind(this));
}