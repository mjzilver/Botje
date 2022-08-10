var moment = require('moment')

module.exports = {
    'name': 'age',
    'description': 'shows how long bot has been living in this server',
    'format': 'age',
    'function': function age(message) {
        var joined = moment(message.guild.members.cache.find(u => u.id === bot.client.user.id).joinedAt)
        const now = moment()
        years = now.diff(joined, 'years')
        days = now.subtract(years, 'years').diff(joined, 'days')
        hours = now.subtract(days, 'days').diff(joined, 'hours')
        birthday = `${joined.format('Do of MMMM')}`

        bot.message.reply(message, `I have been in this server for ${years ? `${years} years, ` : ''}${days} days and ${hours} hours. My birthday is ${birthday}`)
    }
}