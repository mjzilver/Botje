module.exports = async function ping(message) {
	const m = await message.channel.send("Ping?")
	m.edit(`Pong! Latency is ${m.createdTimestamp - message.createdTimestamp}ms.`)
}