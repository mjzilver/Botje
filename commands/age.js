var moment = require('moment')

module.exports = function age(message) {
	var joined = moment(message.guild.members.cache.find(u => u.id === bot.client.user.id).joinedAt)
	logger.console(joined)
	const now = moment()
	years = now.diff(joined, 'years')
	days = now.subtract(years, 'years').diff(joined, 'days')
	hours = now.subtract(days, 'days').diff(joined, 'hours')

	message.channel.send(`I have been in this server for ${years ? `${years} years, ` : ''}${days} days and ${hours} hours.`)
}