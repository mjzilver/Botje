class Database {
    constructor() {
        this.sqlite3 = require('sqlite3');
	
        this.db = new this.sqlite3.Database("./discord.db")
        
        this.initializeDatabase();
    } 
    
	initializeDatabase() {
		this.db.run(`CREATE TABLE IF NOT EXISTS images (link TEXT PRIMARY KEY, sub TEXT)`)
        this.db.run(`CREATE TABLE IF NOT EXISTS messages (user_id TEXT, user_name TEXT, message TEXT, date TEXT, channel TEXT, server TEXT, PRIMARY KEY(user_id, date, channel))`)
        this.db.run(`CREATE TABLE IF NOT EXISTS colors (x INTEGER, y INTEGER, red INTEGER, green INTEGER, blue INTEGER, PRIMARY KEY(x,y))`)
	}

	storemessage(message) {
	if (message.content.length >= 3 && message.guild.member(message.author) 
		&& !message.author.bot && !message.content.match(new RegExp(config.prefix, "i")) && !message.content.match(new RegExp("^t!", "i"))) {
			var insert = this.db.prepare('INSERT OR IGNORE INTO messages (user_id, user_name, message, channel, server, date) VALUES (?, ?, ?, ?, ?, ?)',
				[message.author.id, message.author.username, message.cleanContent, message.channel.id, message.guild.id, message.createdAt.getTime()]);
			insert.run(function (err) {
				if (err) {
					logger.error(`failed to insert: ${message.content} posted by ${message.author.username}`);
					logger.error(err);
				}
			});
		}
	}
}

module.exports = new Database();