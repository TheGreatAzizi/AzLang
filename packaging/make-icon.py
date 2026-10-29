#!/usr/bin/env python3
"""Generates the AzLang application icon.

The generated files are committed, so building a release only needs Node and
the .NET Framework compiler. Run this script only when the artwork changes.
"""
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
SIZE = 512


def gradient(size):
    image = Image.new("RGBA", (size, size))
    pixels = image.load()
    start = (124, 92, 255)
    end = (33, 212, 180)
    for y in range(size):
        for x in range(size):
            t = (x / (size - 1) * 0.42) + (y / (size - 1) * 0.58)
            pixels[x, y] = tuple(
                round(start[i] + (end[i] - start[i]) * t) for i in range(3)
            ) + (255,)
    return image


def rounded_mask(size, radius):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=radius, fill=255)
    return mask


def build():
    image = Image.new("RGBA", (SIZE, SIZE), (0, 0, 0, 0))
    body = gradient(SIZE)
    mask = rounded_mask(SIZE, 112)
    image.paste(body, (0, 0), mask)

    draw = ImageDraw.Draw(image)
    # Subtle glass highlight along the top edge.
    draw.rounded_rectangle(
        (10, 10, SIZE - 11, SIZE - 11),
        radius=104,
        outline=(255, 255, 255, 38),
        width=4,
    )

    # Play mark.
    triangle = [
        (196, 142),
        (196, 370),
        (392, 256),
    ]
    shadow = [(x + 7, y + 11) for x, y in triangle]
    draw.polygon(shadow, fill=(12, 16, 34, 55))
    draw.polygon(triangle, fill=(255, 255, 255, 255))

    return image


def main():
    image = build()
    assets = ROOT / "assets"
    packaging = ROOT / "packaging"
    vscode = ROOT / "editors" / "vscode"
    assets.mkdir(parents=True, exist_ok=True)
    packaging.mkdir(parents=True, exist_ok=True)
    vscode.mkdir(parents=True, exist_ok=True)

    image.resize((256, 256), Image.LANCZOS).save(assets / "azlang-icon.png")
    image.resize((128, 128), Image.LANCZOS).save(vscode / "icon.png")

    sizes = [16, 24, 32, 48, 64, 128, 256]
    image.save(
        packaging / "icon.ico",
        format="ICO",
        sizes=[(s, s) for s in sizes],
    )
    print("Wrote assets/azlang-icon.png, editors/vscode/icon.png, packaging/icon.ico")


if __name__ == "__main__":
    main()
