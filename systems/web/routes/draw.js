const express = require("express")
const router = express.Router()

const database = require("../../../systems/database.js")
const { config } = require("../../../systems/settings.js")

router.get("/", (req, res) => {
    const selectSQL = "SELECT * FROM colors ORDER BY y, x ASC"

    const pixels = new Array(config.image.size)
    for (let i = 0; i < pixels.length; i++) {
        pixels[i] = new Array(config.image.size)
        for (let j = 0; j < pixels[i].length; j++)
            pixels[i][j] = {
                y: i,
                x: j,
                red: 255,
                green: 255,
                blue: 255
            }
    }

    database.query(selectSQL, [], async rows => {
        for (let i = 0; i < rows.length; i++) {
            const element = rows[i]

            if (element.x >= 0 && element.x < config.image.size && element.y >= 0 && element.y < config.image.size)
                pixels[element.y][element.x] = {
                    y: element.y,
                    x: element.x,
                    red: element.red,
                    green: element.green,
                    blue: element.blue
                }
        }
        res.render("pixels", {
            pixels: pixels
        })
    })
})

module.exports = router
