module.exports = {
    'name': 'help',
    'description': 'sends this helpful message',
    'format': 'help',
    'function': function help(message) {
        var helpMessage = `**Here is a list of all the commands *you* can use: **
        Format: \`()\` = optional argument, \`[]\` = required argument\n`
        const args = message.content.split(' ')

        commands = require('../commandholders/commands.js')
        var pageAmount = Math.ceil(Object.entries(commands).length / 10)
        var pageNum = args[1] ? args[1] : 1

        if (pageNum > pageAmount)
            pageNum = pageAmount

        var start = (pageNum - 1) * 10
        var count = 0

        for (const [name, command] of Object.entries(commands)) {
            count++
            if (count >= start && count <= start + 10)
                helpMessage += `\`${command.format}\`: ${command.description} \n`
        }

        const help = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(`:robot: Current commands: :robot:`)
            .setDescription(helpMessage)
            .setFooter(`Page ${pageNum}/${pageAmount} \nCurrent Version: ${package.version}`)

        message.channel.send({ embeds: [help] })
    }
}