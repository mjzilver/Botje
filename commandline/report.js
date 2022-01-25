module.exports = {
    'name': 'report',
    'description': 'reports information about botjes process',
    'format': 'report',
    'function': function report(input) {
        const used = process.memoryUsage();
        for (let key in used) {
            logger.console(`Memory: ${key} ${Math.round(used[key] / 1024 / 1024 * 100) / 100} MB`);
        }
    }
}