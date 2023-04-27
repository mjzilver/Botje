let PNGImage = require("pngjs-image")
let database = require("systems/database.js")
let config = require("config.json")
let bot = require("systems/bot.js")

module.exports = {
    "name": "draw",
    "description": "prints the drawboard image",
    "format": "draw",
    "function": function draw(message) {
        const totalImageSize = config.image.size * config.image.magnification
        let image = PNGImage.createImage(totalImageSize, totalImageSize)
        image.fillRect(0, 0, totalImageSize, totalImageSize, {
            red: 255,
            green: 255,
            blue: 255,
            alpha: 255
        })

        let selectSQL = "SELECT * FROM colors"

        database.query(selectSQL, [], async (rows) => {
            for (let i = 0; i < rows.length; i++)
                if (rows[i].x >= 0 && rows[i].x < config.image.size && rows[i].y >= 0 && rows[i].y < config.image.size)
                    image.fillRect(rows[i].x * config.image.magnification, rows[i].y * config.image.magnification, config.image.magnification, config.image.magnification, {
                        red: rows[i].red,
                        green: rows[i].green,
                        blue: rows[i].blue,
                        alpha: 255
                    })

            image.writeImage("views/images/image.png", function () {
                bot.message.reply(message, "Current image", {
                    files: ["views/images/image.png"]
                })
            })
        })
    }
}