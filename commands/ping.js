module.exports = {
	'name': 'ping',
	'description': 'prints the current reaction speed of botje in milliseconds',
	'format': 'ping',
	'function': async function ping(message) {
		const m = await message.channel.send("Ping?")
		m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms.`)
	}
}