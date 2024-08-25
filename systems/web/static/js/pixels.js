/* eslint-disable */
let socket = io()

function pixelClick(x, y) {
    const colorHex = document.getElementById("color").value
    const colorRGB = hexToRgb(colorHex)
    socket.emit("pixelChange", {
        x: x,
        y: y,
        red: colorRGB.r,
        green: colorRGB.g,
        blue: colorRGB.b
    })
}

socket.on("pixelChanged", function (pixel) {
    const pixelElement = document.getElementById(`${pixel.x}-${pixel.y}`)
    pixelElement.style.backgroundColor = `rgb(${pixel.red}, ${pixel.green}, ${pixel.blue})`
})

function hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null
}

function zoomIn() {
    const styleTag = document.createElement("style")
    styleTag.innerHTML = ".pixel {padding: 0;width: 0.5vw !important;height: 0.5vw !important;}"
    document.head.appendChild(styleTag)
}

function zoomOut() {
    const styleTags = document.querySelectorAll("style")
    styleTags.forEach(tag => tag.remove())
}

socket.on("connectCounter", function (connectCounter) {
    document.getElementById("connectCounter").textContent = connectCounter
})

socket.on("disconnect", (reason) => {
    if (reason === "io server disconnect") {
        document.getElementById("errorlabel").textContent = "You got kicked"
    }
    // else the socket will automatically try to reconnect
})
