module.exports = {
    'name': 'ping',
    'description': 'prints the current reaction speed of bot in milliseconds',
    'format': 'ping',
    'function': async function ping(message) {
        const m = await bot.message.send(message, "Ping?")
        return m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms.`)
    }
}