module.exports = {
    'name': 'getemote',
    'description': 'gets the emote',
    'format': 'getemote [emote name]',
    'function': async function getemote(message) {
        var args = message.content.split(' ')
        args.shift()

        if (args[0]) {
            var path = `./backups/emotes/${message.guild.id}/${args[0]}.png`
            if (fs.existsSync(path))
                message.reply({ files: [path] })
            else
                message.reply(`No emote named ${args[0]} found`)
        }
    }
}