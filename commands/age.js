var moment = require('moment')

module.exports = {
    'name': 'age',
    'description': 'shows how long botje has been living in this server',
    'format': 'age',
    'function': function age(message) {
        var joined = moment(message.guild.members.cache.find(u => u.id === bot.client.user.id).joinedAt)
        logger.console(joined)
        const now = moment()
        years = now.diff(joined, 'years')
        days = now.subtract(years, 'years').diff(joined, 'days')
        hours = now.subtract(days, 'days').diff(joined, 'hours')
        birthday = `${joined.format('Do of MMMM')}`

        message.channel.send(`I have been in this server for ${years ? `${years} years, ` : ''}${days} days and ${hours} hours. My birthday is ${birthday}`)
    }
}