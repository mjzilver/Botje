module.exports = {
    'name': 'match',
    'description': '',
    'format': 'match [string]',
    'function': function match(message) {
        var input = message.content.split(' ').slice(1)
        var spellchecked = spellcheck.checkSentence(input.join(' '));

        message.reply(`Found match: '${spellchecked.result}' \nYou made ${spellchecked.mistakes} mistakes`)
    }
}