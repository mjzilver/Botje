module.exports = {
    'name': 'match',
    'description': 'Ignore this one',
    'format': 'match [string]',
    'function': function match(message) {
        var words = message.content.split(' ')

        if (words[0] == 'match')
            words.shift()

        var spellchecked = spellcheck.checkSentence(words.join(' '))

        if (spellchecked.mistakes >= 1) {
            message.reply(`You made a mistake retard, it should be: \n"${spellchecked.result}"`)
        }
    }
}