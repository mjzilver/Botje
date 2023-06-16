let fs = require("fs")
let bot = require("systems/bot.js")
let Jimp = require("jimp")

module.exports = {
    "name": "combine",
    "description": "combines two emotes into one", 
    "format": "combine [emote name] [emote name]",
    "function": async function combine(message) {
        let args = message.content.split(" ")
        args.shift()
        let path = `backups/emotes/${message.guild.id}/`
        let files = fs.readdirSync(path)

        let emoteParser = /:(.+?)(~.*)?:[0-9]*/

        if (!args[0]) 
            args[0] = files.pickRandom()
        if (!args[1])
            args[1] = files.pickRandom()

        let image1 = args[0] + ".png"
        let image2 = args[1] + ".png"
            
        if (!files.includes(image1) || !files.includes(image2)) {
            if (args[0].match(emoteParser)) 
                image1 = args[0].match(emoteParser)[1] + ".png"	
            
            if (args[1].match(emoteParser)) 
                image2 = args[1].match(emoteParser)[1] + ".png"
        
            if (!files.includes(image1) || !files.includes(image2)) {
                image1 = bot.logic.findClosestMatchInList(args[0], files)
                image2 = bot.logic.findClosestMatchInList(args[1], files) 
                return processCombination(image1, image2, message)  
            } else {
                return processCombination(image1, image2, message)
            }
        } else {
            return processCombination(image1, image2, message)  
        }
    }
}

async function processCombination(image1, image2, message) {
    let path = `backups/emotes/${message.guild.id}/`
    let outputPath = "assets/combined.png"

    Jimp.read(path + image1).then(image => {
        Jimp.read(path + image2).then(image2 => {
            image.resize(128, 128)
            image2.resize(128, 128)

            // image 1 is the top half and image 2 is the bottom half
            image.crop(0, 0, 128, 64)
            image2.crop(0, 64, 128, 64) 

            let combined = new Jimp(128, 128)
            combined.composite(image, 0, 0)
            combined.composite(image2, 0, 64)
            combined.write(outputPath, () => {
                bot.message.reply(message, { files: [outputPath] })
            })
        })
    })
}