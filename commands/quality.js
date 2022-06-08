var letter_values = require('../json/letter_values.json')

function calculateScore(message) {
    var score = 0
    for (var i = 0; i < message.length; i++)
        score += letter_values[message.charAt(i)] === undefined ? 0 : letter_values[message.charAt(i)]
    return score
}

module.exports = {
    'name': 'quality',
    'description': `shows the top 10 quality posers in the current channel or mentioned user`,
    'format': 'quality (@user)',
    'function': function score(message) {
        const mentioned = message.mentions.users.first()
        const args = message.content.split(' ')
        var page = (args[1] ? args[1] - 1 : 0)

        if (mentioned) {
            mention(message, mentioned)
        } else {
            perPerson(message, page)
        }
    }
}

function mention(message, mentioned) {
    let selectSQL = `SELECT user_id, user_name, message 
    FROM messages 
    WHERE server = ${message.guild.id} AND user_id = ${mentioned.id} `

    var userdata = {
        'points': 0,
        'total': 0,
        'quality': 0
    }

    database.query(selectSQL, [], (rows) => {
        for (var i = 0; i < rows.length; i++) {
            userdata['points'] += calculateScore(rows[i]['message'])
            userdata['total'] += rows[i]['message'].length
        }

        userdata['quality'] = Math.round(((userdata['points'] / userdata['total']) * 100) / 2)

        message.channel.send(`${mentioned.username}'s post quality is ${userdata['quality']}%`)
    })
}

function perPerson(message, page) {
    let selectSQL = `SELECT user_id, user_name, message
    FROM messages 
    WHERE server = ${message.guild.id}
    ORDER BY user_id`

    var userdata = {}

    database.query(selectSQL, [], (rows) => {
        for (var i = 0; i < rows.length; i++) {
            var user_name = rows[i]['user_name']

            if (!userdata[user_name])
                userdata[user_name] = {
                    'points': 0,
                    'total': 0,
                    'quality': 0
                }

            userdata[user_name]['points'] += calculateScore(rows[i]['message'])
            userdata[user_name]['total'] += rows[i]['message'].length
        }

        var sorted = []
        for (var user in userdata) {
            // magical calculation
            userdata[user]['quality'] = Math.round(((userdata[user]['points'] / userdata[user]['total']) * 100) / 2)
            sorted.push([user, userdata[user]['quality']])
        }

        sorted.sort(function (a, b) {
            return b[1] - a[1]
        })

        if (page > Math.ceil(sorted.length / 10))
            return message.channel.send(`Page ${(page + 1)} of ${Math.ceil(sorted.length / 10)} not found`)

        var result = ""
        for (var i = page * 10; i < sorted.length && i <= (page * 10) + 9; i++)
            result += `${sorted[i][0]}'s post quality is ${sorted[i][1]}% \n`

        const top = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(`Top 10 quality posters in ${message.guild.name}`)
            .setDescription(result)
            .setFooter(`Page ${(page + 1)} of ${Math.ceil(sorted.length / 10)}`)

        message.channel.send({
            embeds: [top]
        })
    })
}