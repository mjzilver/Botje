var moment = require('moment');

module.exports = function(message) {
    var login = moment(bot.readyTimestamp);
	const now = moment();
	hours = now.diff(login, 'hours');
	minutes = now.subtract(hours, 'hours').diff(login, 'minutes');
	seconds = now.subtract(minutes, 'minutes').diff(login, 'seconds');

	message.channel.send(`I have been online for ${hours} hours, ${minutes} minutes and ${seconds} seconds.`)
}
