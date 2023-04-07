let discord = require('discord.js')
let projectPackage = require('../package.json')
let config = require('../config.json')

module.exports = {
    'name': 'opt-out',
    'description': 'lets you opt-out of usage of botje',
    'format': 'opt-out',
    'function': function opt_out(message) {
        const filter = launchMessage => {
            return (launchMessage.content.startsWith('accept') && launchMessage.author.id == message.author.id)
        }

        message.channel.awaitMessages({ filter, max: 1, time: 60000 })
            .then(collected => {
                bot.message.send(message, `You are not opted-out and botje will delete your data and you will not be able to give it commands.`)
                deleteUserData(message)
            })

        const help = new discord.MessageEmbed()
            .setColor(config.color_hex)
            .setTitle(`Opting out`)
            .setDescription(opt_outMessage)
            .setFooter(`This cannot be undone`)

        bot.message.send(message, { embeds: [help] })
    }
}

const opt_outMessage = `
**Read this completely before accepting:**

When you opt-out of use of Botje all your data will be deleted and you data will never be collected again.
You cannot use any of Botje's features.
You will not be included in any of the statistic lists.

If you still wish to opt-out completely you need to type 'b!accept'
`

function deleteUserData(message) {
    console.log('delete')
}