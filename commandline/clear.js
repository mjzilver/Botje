module.exports = {
    'name': 'clear',
    'description': 'clears the console without effecting the logs',
    'format': 'clear',
    'function': function clear(input) {
        console.clear()
        logger.console('Console was cleared')
    }
}