module.exports = {
    'name': 'help',
    'description': 'sends this helpful message',
    'format': 'help',
    'function': function help(message) {
        var helpMessage = `**Here is a list of all the commands *you* can use: **
        Format: \`()\` = optional argument, \`[]\` = required argument\n`
        
        commands = require('../commandholders/commands.js')
        for (const [name, command] of Object.entries(commands))
            helpMessage += `\`${command.format}\`: ${command.description} \n`

        const help = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(`:robot: Current commands: :robot:`)
            .setDescription(helpMessage)
            .setFooter(`Current Version: ${package.version}`)

        message.channel.send({embeds: [help]})
    }
}