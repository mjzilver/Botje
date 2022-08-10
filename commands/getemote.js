module.exports = {
    'name': 'getemote',
    'description': 'gets the emote',
    'format': 'getemote [emote name]',
    'function': async function getemote(message) {
        var args = message.content.split(' ')
        args.shift()
        var path = `./backups/emotes/${message.guild.id}/`


        if (args[0] == "?") {
            var files = fs.readdirSync(path)
            var result = ""
            for (let i = 0; i < files.length; i++) {
                result += `${files[i]}, `
            }

            message.reply(`Emotes backed up for this server: ${result}`)
        } else if (args[0]) {
            path += `${args[0]}.png`
            if (fs.existsSync(path))
                message.reply({ files: [path] })
            else
                message.reply(`No emote named ${args[0]} found`)
        }
    }
}