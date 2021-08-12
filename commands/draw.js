var PNGImage = require('pngjs-image');

module.exports = function draw(message) {
    const db = database.db
    var image = PNGImage.createImage(web.imageSize * 2, web.imageSize * 2)
    image.fillRect(0, 0, web.imageSize * 2, web.imageSize * 2, { red: 255, green: 255, blue: 255,  alpha: 255 })

    let selectSQL = 'SELECT * FROM colors'

    db.all(selectSQL, [], async (err, rows) => {
        if (err)
            throw err
        for (var i = 0; i < rows.length; i++)
            if (rows[i].x >= 0 && rows[i].x < web.imageSize && rows[i].y >= 0 && rows[i].y < web.imageSize)
                image.fillRect(rows[i].x * 2, rows[i].y * 2, 2, 2, { red: rows[i].red, green: rows[i].green, blue: rows[i].blue, alpha: 255 })

        image.writeImage('./views/images/image.png', function (err) {
            message.channel.send("Current image", { files: ["./views/images/image.png"] });
        });
    });
}