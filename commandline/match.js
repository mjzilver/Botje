module.exports = {
    'name': 'match',
    'description': '',
    'format': 'match [string]',
    'function': function match(input) {
        if(input.length >= 1) {
            logger.console(`Searching for a match for ${input.join(' ')}...`)
            var words = []
            var mistakes = 0;

            for (const word of input) {
                if(spellcheck.checkWord(word)) {
                    words.push(word)
                } else {
                    var result = spellcheck.findClosestWord(word)
                    mistakes++                
                    words.push(result)
                }
            }
            logger.console(`Found match: ${words.join(' ')}.. You made ${mistakes} mistakes`)
        }
    }
}