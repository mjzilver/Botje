from PIL import Image

im = Image.open("drawboard.png")   
out = ""

width, height = im.size
for x in range(width):
    for y in range(height):
        pixel = im.getpixel((x,y))
        r, g, b = pixel[0], pixel[1], pixel[2]
        if ((x % 2 == 0) & (y % 2 == 0)):
            out += f"insert into colors (x, y, red, green, blue) values ({int(x/2)}, {int(y/2)}, {r}, {g}, {b});\n"


file = open("output.txt","a")
file.write(out)
file.close()