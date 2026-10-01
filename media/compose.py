#!/usr/bin/env python3
"""Ridge City media kit v1: share card, banner and icons from the captured key art.

    python3 media/compose.py            # writes public/og.jpg, public/banner.jpg, public/icon-512.png, public/icon-180.png

Inputs: media/keyart.png (1920x1080, the game's own render at 2x, no DOM HUD; see media/capture.mjs `keyart`)
and media/icon.svg. Fonts are the game's own (Barlow Condensed, IBM Plex Sans; SIL OFL), fetched from
Google Fonts into ~/.cache/ridge-city-media/fonts on first run. Needs Pillow and the Inkscape CLI.
"""
import os
import subprocess
import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
MEDIA, PUBLIC = ROOT / "media", ROOT / "public"
FONTS = Path(os.environ.get("RC_FONTS", Path.home() / ".cache/ridge-city-media/fonts"))

# Google Fonts static TTFs (css2 API, truetype flavour), the same families index.html loads
FONT_URLS = {
    "BarlowCondensed-ExtraBold.ttf": "https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B47b1_3E.ttf",
    "BarlowCondensed-Bold.ttf": "https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B46r2_3E.ttf",
    "BarlowCondensed-SemiBold.ttf": "https://fonts.gstatic.com/s/barlowcondensed/v13/HTxwL3I-JCGChYJ8VI-L6OO_au7B4873_3E.ttf",
    "IBMPlexSans-SemiBold.ttf": "https://fonts.gstatic.com/s/ibmplexsans/v23/zYXGKVElMYYaJe8bpLHnCwDKr932-G7dytD-Dmu1swZSAXcomDVmadSDNF5zAA.ttf",
}

# the game's tokens (src/styles.css)
BG = (7, 9, 12)
FG = (232, 237, 242)
MUTED = (139, 152, 165)
CASH = (198, 240, 106)
ACCENT = (217, 122, 50)

TITLE = "RIDGE CITY"
TAGLINE = "Boost cars. Lose the tail. Get paid."
KICKER = "AGES 10+ · NO GORE"
URL = "ridgecity.icf.games"

# where the action sits in keyart.png (1920x1080): the jacked car, and the two cruisers behind it
CAR = (1056, 538)


def font(name, size):
    path = FONTS / name
    if not path.exists():
        FONTS.mkdir(parents=True, exist_ok=True)
        urllib.request.urlretrieve(FONT_URLS[name], path)
    return ImageFont.truetype(str(path), size)


def tracked(draw, xy, text, fnt, fill, tracking=0.0):
    """Draw text with letter spacing (em fraction), like CSS letter-spacing. Returns the end x."""
    x, y = xy
    em = fnt.size
    for ch in text:
        draw.text((x, y), ch, font=fnt, fill=fill)
        x += draw.textlength(ch, font=fnt) + tracking * em
    return x - tracking * em


def tracked_width(draw, text, fnt, tracking=0.0):
    return sum(draw.textlength(ch, font=fnt) for ch in text) + tracking * fnt.size * (len(text) - 1)


def left_shade(size, solid, fade, alpha=0.94):
    """Dark panel on the left that fades out to the right, so the title sits on the city, not a box."""
    w, h = size
    mask = Image.new("L", (w, 1), 0)
    px = mask.load()
    for x in range(w):
        if x <= solid:
            a = alpha
        elif x >= fade:
            a = 0.0
        else:
            t = (x - solid) / (fade - solid)
            a = alpha * (1 - t) ** 1.6
        px[x, 0] = int(255 * a)
    mask = mask.resize((w, h))
    layer = Image.new("RGBA", (w, h), BG + (255,))
    layer.putalpha(mask)
    return layer


def vignette(size, strength=0.45):
    w, h = size
    m = Image.new("L", (w, h), 0)
    d = ImageDraw.Draw(m)
    d.ellipse((-w * 0.25, -h * 0.35, w * 1.25, h * 1.35), fill=255)
    m = m.filter(ImageFilter.GaussianBlur(min(w, h) * 0.18))
    inv = Image.eval(m, lambda v: int((255 - v) * strength))
    layer = Image.new("RGBA", (w, h), BG + (255,))
    layer.putalpha(inv)
    return layer


def card(art):
    W, H = 1200, 630
    car_at = (868, 338)  # car on the right third, headlights pointing at the title
    x0, y0 = CAR[0] - car_at[0], CAR[1] - car_at[1]
    img = art.crop((x0, y0, x0 + W, y0 + H)).convert("RGBA")
    img.alpha_composite(vignette((W, H), 0.5))
    img.alpha_composite(left_shade((W, H), solid=330, fade=790))
    d = ImageDraw.Draw(img)
    left = 76
    # accent bar, the start card's and toast's orange edge
    d.rectangle((left - 30, 158, left - 24, 486), fill=ACCENT)
    tracked(d, (left, 158), KICKER, font("BarlowCondensed-Bold.ttf", 28), ACCENT, 0.18)
    tracked(d, (left - 4, 190), TITLE, font("BarlowCondensed-ExtraBold.ttf", 152), FG, 0.05)
    tracked(d, (left, 368), TAGLINE, font("BarlowCondensed-SemiBold.ttf", 48), CASH, 0.03)
    # no star row here: on a share card five stars read as a review score, not the wanted meter
    d.text((left, 446), URL, font=font("IBMPlexSans-SemiBold.ttf", 28), fill=MUTED)
    return img.convert("RGB")


def banner(art):
    W, H = 1200, 264
    scale = 0.75  # a little more road than the card: crop 1600x352 and scale down
    cw, ch = int(W / scale), int(H / scale)
    car_at = (int(860 / scale), int(150 / scale))
    x0, y0 = CAR[0] - car_at[0], CAR[1] - car_at[1]
    img = art.crop((x0, y0, x0 + cw, y0 + ch)).resize((W, H), Image.LANCZOS).convert("RGBA")
    img.alpha_composite(vignette((W, H), 0.4))
    img.alpha_composite(left_shade((W, H), solid=380, fade=850))
    d = ImageDraw.Draw(img)
    left = 64
    d.rectangle((left - 24, 52, left - 19, 212), fill=ACCENT)
    end = tracked(d, (left - 3, 40), TITLE, font("BarlowCondensed-ExtraBold.ttf", 118), FG, 0.05)
    tracked(d, (left, 172), TAGLINE, font("BarlowCondensed-SemiBold.ttf", 38), CASH, 0.03)
    return img.convert("RGB")


def icons():
    svg = MEDIA / "icon.svg"
    for size in (512, 180):
        out = PUBLIC / f"icon-{size}.png"
        subprocess.run(
            ["inkscape", str(svg), "--export-type=png", f"--export-filename={out}", f"--export-width={size}", f"--export-height={size}", "--export-background-opacity=1"],
            check=True, capture_output=True,
        )
        # opaque RGB: iOS fills transparency with black anyway, and a maskable icon must be full bleed
        Image.open(out).convert("RGB").save(out, optimize=True)


if __name__ == "__main__":
    art = Image.open(MEDIA / "keyart.png").convert("RGB")
    assert art.size == (1920, 1080), art.size
    card(art).save(PUBLIC / "og.jpg", quality=88, optimize=True, progressive=True)
    banner(art).save(PUBLIC / "banner.jpg", quality=88, optimize=True, progressive=True)
    icons()
    for f in ("og.jpg", "banner.jpg", "icon-512.png", "icon-180.png"):
        im = Image.open(PUBLIC / f)
        print(f, im.size, im.mode, (PUBLIC / f).stat().st_size // 1024, "KB")
