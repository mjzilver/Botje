var PNGImage = require('pngjs-image')

module.exports = {
    'name': 'draw',
    'description': 'prints the drawboard image',
    'format': 'draw',
    'function': function draw(message) {
        const db = database.db
        const totalImageSize = config.image.size * config.image.magnification
        var image = PNGImage.createImage(totalImageSize, totalImageSize)
        image.fillRect(0, 0, totalImageSize, totalImageSize, {
            red: 255,
            green: 255,
            blue: 255,
            alpha: 255
        })

        let selectSQL = 'SELECT * FROM colors'

        db.all(selectSQL, [], async (err, rows) => {
            if (err)
                throw err
            for (var i = 0; i < rows.length; i++)
                if (rows[i].x >= 0 && rows[i].x < config.image.size && rows[i].y >= 0 && rows[i].y < config.image.size)
                    image.fillRect(rows[i].x * config.image.magnification, rows[i].y * config.image.magnification, config.image.magnification, config.image.magnification, {
                        red: rows[i].red,
                        green: rows[i].green,
                        blue: rows[i].blue,
                        alpha: 255
                    })

            image.writeImage('./views/images/image.png', function (err) {
                message.channel.send("Current image", {
                    files: ["./views/images/image.png"]
                })
            })
        })
    }
}