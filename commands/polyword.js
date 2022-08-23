module.exports = {
    'name': 'polyword',
    'description': 'name all the words present',
    'format': 'polyword [word]',
    'function': async function polyword(message) {
        const args = message.content.split(' ')

        console.log(args[1])

        console.log(bot.dictionary.getWordsByLength(args[1]))
        bot.message.markComplete(message)
    }
}