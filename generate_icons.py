from PIL import Image, ImageDraw, ImageFont

SIZES = [192, 512]
BG = (33, 128, 88)  # vert appétissant
FG = (255, 255, 255)

for size in SIZES:
    img = Image.new("RGB", (size, size), BG)
    draw = ImageDraw.Draw(img)
    text = "MF"
    font = None
    for path in [
        "C:/Windows/Fonts/segoeuib.ttf",
        "C:/Windows/Fonts/arialbd.ttf",
        "C:/Windows/Fonts/arial.ttf",
    ]:
        try:
            font = ImageFont.truetype(path, int(size * 0.42))
            break
        except Exception:
            continue
    if font is None:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), text, font=font)
    w, h = bbox[2] - bbox[0], bbox[3] - bbox[1]
    draw.text(((size - w) / 2 - bbox[0], (size - h) / 2 - bbox[1]), text, fill=FG, font=font)
    img.save(f"icons/icon-{size}.png")

print("done")
