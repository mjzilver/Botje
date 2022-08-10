module.exports = {
    'name': 'choose',
    'description': 'chooses one of the options given',
    'format': 'choose [option] | [option2]',
    'function': async function choose(message) {
        const filtered = message.content.replace(/choose /g, '')
        const items = filtered.split('|')

        var presets = ["You should", "You ought to", "I pick", "I tell you", "An Angel told me in a dream that", "The tarot card reads"]

        return bot.message.reply(message, `${presets.pickRandom()} \`${items.pickRandom().trim()}\``)
    }
}