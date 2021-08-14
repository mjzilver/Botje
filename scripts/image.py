from PIL import Image

im = Image.open("drawboard.png")   
out = ""

magnification = 3

width, height = im.size
for x in range(width):
    for y in range(height):
        pixel = im.getpixel((x,y))
        r, g, b = pixel[0], pixel[1], pixel[2]
        if ((x % magnification == 0) & (y % magnification == 0)):
            out += f"INSERT INTO colors (x, y, red, green, blue) VALUES ({int(x/magnification)}, {int(y/magnification)}, {r}, {g}, {b});\n"

file = open("output.txt","a")
file.write(out)
file.close()