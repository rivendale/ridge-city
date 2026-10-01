#!/usr/bin/env python3
"""Ridge City media kit v1: share card, banner and icons from the captured key art.

    python3 media/compose.py            # writes public/og.jpg, public/banner.jpg, public/icon-512.png, public/icon-180.png

Inputs: media/keyart.png (1920x1080, the game's own render at 2x, no DOM HUD; see media/capture.mjs `keyart`)
and media/icon.svg. Fonts are the game's own (Barlow Condensed, IBM Plex Sans; SIL OFL), fetched from
Google Fonts into ~/.cache/ridge-city-media/fonts on first run. Needs Pillow and the Inkscape CLI.

The rating line on the card is read from the game's own start card (src/game/RidgeCity.tsx), never typed
here, and the build refuses if the share descriptions in index.html name a different age. The kicker is
stamped into og.jpg as a JPEG comment so `media/check.py` can tell when the card predates a rating change.
"""
import os
import re
import subprocess
import sys
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
URL = "ridgecity.icf.games"
GAME_UI = ROOT / "src/game/RidgeCity.tsx"
INDEX = ROOT / "index.html"

# where the action sits in keyart.png (1920x1080): the jacked car, and the two cruisers behind it
CAR = (1056, 538)


def game_kicker():
    """The rating line exactly as the game's start card shows it, e.g. 'AGES 10+ · NO GORE'."""
    m = re.search(r'<div className="kicker">\s*(AGES [^<]*?)\s*</div>', GAME_UI.read_text(encoding="utf-8"))
    if not m:
        sys.exit(f"compose: no 'AGES ...' kicker on the start card in {GAME_UI.relative_to(ROOT)}")
    return m.group(1)


def rating_of(kicker):
    """'AGES 10+ · NO GORE' -> '10+'; 'AGES 10-13 · ...' -> '10-13'."""
    return kicker.split()[1]


def rating_problems(kicker):
    """Every share description in index.html must name the same age as the game; returns what disagrees."""
    want = f"ages {rating_of(kicker)}".lower()
    html = INDEX.read_text(encoding="utf-8")
    probs = []
    for key in ('name="description"', 'property="og:description"', 'name="twitter:description"'):
        m = re.search(r"<meta " + re.escape(key) + r' content="([^"]*)"', html)
        if not m:
            probs.append(f"index.html: no {key} meta")
        elif want not in m.group(1).lower():
            probs.append(f"index.html {key} does not say '{want}' (the game's start card says '{kicker}')")
    return probs


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


def left_shade(size, solid, fade, alpha=0.98):
    """Dark panel on the left that fades out to the right, so the title sits on the city, not a box.
    0.98, not 0.94: at 0.94 the city's lit windows showed through at lower left on the card and banner."""
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


def title_band(size, box, alpha=0.95, feather=45):
    """Extra shade behind the title block, so crosswalk paint does not show through the gap between
    RIDGE and CITY. Feathered so it reads as shading, not a box."""
    w, h = size
    m = Image.new("L", (w, h), 0)
    ImageDraw.Draw(m).rectangle(box, fill=255)
    m = m.filter(ImageFilter.GaussianBlur(feather))
    layer = Image.new("RGBA", (w, h), BG + (255,))
    layer.putalpha(Image.eval(m, lambda v: int(v * alpha)))
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


def card(art, kicker):
    W, H = 1200, 630
    car_at = (868, 338)  # car on the right third, headlights pointing at the title
    x0, y0 = CAR[0] - car_at[0], CAR[1] - car_at[1]
    img = art.crop((x0, y0, x0 + W, y0 + H)).convert("RGBA")
    img.alpha_composite(vignette((W, H), 0.5))
    img.alpha_composite(left_shade((W, H), solid=360, fade=790))
    # fades out by x ~650, so the road behind CITY and the car's headlight beam (car at x 868) stay lit
    img.alpha_composite(title_band((W, H), (0, 150, 560, 520)))
    d = ImageDraw.Draw(img)
    left = 76
    # accent bar, the start card's and toast's orange edge
    d.rectangle((left - 30, 150, left - 24, 498), fill=ACCENT)
    # kicker and URL at 35 px: about 12 px when a phone shows the card 400 px wide
    tracked(d, (left, 150), kicker, font("BarlowCondensed-Bold.ttf", 35), ACCENT, 0.16)
    tracked(d, (left - 4, 190), TITLE, font("BarlowCondensed-ExtraBold.ttf", 152), FG, 0.05)
    tracked(d, (left, 368), TAGLINE, font("BarlowCondensed-SemiBold.ttf", 48), CASH, 0.03)
    # no star row here: on a share card five stars read as a review score, not the wanted meter
    d.text((left, 450), URL, font=font("IBMPlexSans-SemiBold.ttf", 35), fill=MUTED)
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
    # same job as on the card: crosswalk paint showed in the gap between the I and T of CITY (x ~425)
    img.alpha_composite(title_band((W, H), (0, 30, 480, 230), feather=35))
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
    kicker = game_kicker()
    probs = rating_problems(kicker)
    if probs:
        sys.exit("compose: refusing to build a card the share text contradicts:\n  " + "\n  ".join(probs))
    art = Image.open(MEDIA / "keyart.png").convert("RGB")
    assert art.size == (1920, 1080), art.size
    card(art, kicker).save(PUBLIC / "og.jpg", quality=88, optimize=True, progressive=True, comment=kicker.encode("utf-8"))
    banner(art).save(PUBLIC / "banner.jpg", quality=88, optimize=True, progressive=True)
    icons()
    for f in ("og.jpg", "banner.jpg", "icon-512.png", "icon-180.png"):
        im = Image.open(PUBLIC / f)
        print(f, im.size, im.mode, (PUBLIC / f).stat().st_size // 1024, "KB")
