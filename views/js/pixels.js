var socket = io();

function pixelClick(x, y)
{
    var colorHex = $(`#color`).val();
    var colorRGB = hexToRgb(colorHex)
    socket.emit('pixelChange', {x: x, y: y, red: colorRGB.r, green: colorRGB.g, blue: colorRGB.b});
}

socket.on('pixelChanged', function(pixel)
{
    $(`#${pixel.x}-${pixel.y}`).attr("style", ""); 
    $(`#${pixel.x}-${pixel.y}`).attr("style", `background-color: rgb(${pixel.red}, ${pixel.green}, ${pixel.blue}) !important;`); 
})

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}

function zoomIn()
{
    var styleTag = $('<style> .pixel {padding: 0;width: 0.5vw !important;height: 0.5vw !important;}</style>')
    $('html > head').append(styleTag);
}

function zoomOut()
{
    $('style').remove();
}

socket.on('connectCounter', function(connectCounter) {
    $("#connectCounter").text(connectCounter);
})

socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') {
      $("#errorlabel").text('You got kicked');
    }
    // else the socket will automatically try to reconnect
});