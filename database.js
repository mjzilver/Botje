
class Database {
    constructor() {
        this.sqlite3 = require('sqlite3');
	
        this.db = new this.sqlite3.Database("./discord.db")
        
        this.initializeDatabase();
    } 
    
	initializeDatabase() {
		this.db.run(`CREATE TABLE IF NOT EXISTS images (link TEXT PRIMARY KEY, sub TEXT)`)
		this.db.run(`CREATE TABLE IF NOT EXISTS messages (user_id TEXT, user_name TEXT, message TEXT, date TEXT, channel TEXT, PRIMARY KEY(user_id, date, channel))`)
	}

	storemessage(message) {
		if (message.content.length >= 3 && !message.author.equals(bot.user) && !message.content.match(new RegExp(config.prefix, "i"))) {
			var insert = this.db.prepare('INSERT OR IGNORE INTO messages (user_id, user_name, message, channel, date) VALUES (?, ?, ?, ?, ?)',
				[message.author.id, message.author.username, message.cleanContent, message.channel.id, message.createdAt.getTime()]);
			insert.run(function (err) {
				if (err) {
					logger.error("failed to insert: " + message.content + ' posted by ' + message.author.username);
					logger.error(err);
				}
			});
		}
	}
}

module.exports = new Database();