
var socket = io();
console.log( "ready!" );

function pixelClick(x, y)
{
    console.log(`clicked pixel ${x} - ${y}`)
    var colorHex = $(`#color`).val();
    var colorRGB = hexToRgb(colorHex)
    socket.emit('pixelChange', {x: x, y: y, red: colorRGB.r, green: colorRGB.g, blue: colorRGB.b});
}

socket.on('pixelChanged', function(pixel)
{
    console.log('pixel update' + pixel)
    $(`#${pixel.x}-${pixel.y}`).attr("style", ""); 
    $(`#${pixel.x}-${pixel.y}`).attr("style", `padding:0;width:5px;height:5px;background-color: rgb(${pixel.red}, ${pixel.green}, ${pixel.blue}) !important;`); 
})

function hexToRgb(hex) {
    var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
    } : null;
}
