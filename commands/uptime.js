var moment = require('moment')

module.exports = function uptime(message) {
    var login = moment(bot.bot.readyTimestamp)
	const now = moment()
	days = now.diff(login, 'days')
	hours = now.subtract(days, 'days').diff(login, 'hours')
	minutes = now.subtract(hours, 'hours').diff(login, 'minutes')
	seconds = now.subtract(minutes, 'minutes').diff(login, 'seconds')

	message.channel.send(`I have been online for ${days ? `${days} days, ` : ''}${hours ? `${hours} hours, ` : ''}${minutes} minutes and ${seconds} seconds`)
}
