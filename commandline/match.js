module.exports = {
    'name': 'match',
    'description': '',
    'format': 'match [string]',
    'function': function match(input) {
        if (input.length >= 1) {
            let spellchecked = bot.spellcheck.checkSentence(input.join(' '))
            logger.console(`Found match: '${spellchecked.result}' \nYou made ${spellchecked.mistakes} mistakes`)
        }
    }
}