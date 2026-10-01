#!/usr/bin/env python3
"""Ridge City media kit checks. Exit 0 only when every check passes; each failure is one line saying what is wrong.

    python3 media/check.py            # the kit in this tree: sizes, share tags, and the card's rating vs the game's
    python3 media/check.py --live     # the deployed site, after it ships: checked from the player's side

The live check fetches the page a share preview would fetch, reads its og:image, and confirms that URL serves
the same bytes as public/og.jpg. It cannot see a platform's preview cache; see media/README.md, "Ship".
"""
import hashlib
import re
import sys
import urllib.error
import urllib.request

from PIL import Image

from compose import INDEX, PUBLIC, ROOT, game_kicker, rating_problems

SIZES = {"og.jpg": ((1200, 630), "JPEG"), "banner.jpg": ((1200, 264), "JPEG"),
         "icon-512.png": ((512, 512), "PNG"), "icon-180.png": ((180, 180), "PNG")}


def meta(html, attr, key):
    m = re.search(r"<meta " + attr + r'="' + re.escape(key) + r'" content="([^"]*)"', html)
    return m.group(1) if m else None


def local():
    fails = []
    for name, (size, fmt) in SIZES.items():
        im = Image.open(PUBLIC / name)
        if (im.size, im.format) != (size, fmt):
            fails.append(f"public/{name} is {im.format} {im.size}, wants {fmt} {size}")
    stills = sorted((ROOT / "media/screens").glob("*.png"))
    if not 4 <= len(stills) <= 6:
        fails.append(f"media/screens has {len(stills)} stills, the spec wants 4 to 6")
    for f in stills:
        if Image.open(f).size != (1280, 720):
            fails.append(f"media/screens/{f.name} is not 1280x720")
    # the rating is baked into the card: it must be the game's current start-card line
    kicker = game_kicker()
    baked = (Image.open(PUBLIC / "og.jpg").info.get("comment") or b"").decode("utf-8", "replace")
    if baked != kicker:
        fails.append(f"og.jpg was built for '{baked or '(unstamped)'}', the game's start card says '{kicker}': run python3 media/compose.py")
    fails += rating_problems(kicker)
    html = INDEX.read_text(encoding="utf-8")
    site = meta(html, "property", "og:url") or ""
    want = site + "og.jpg"
    for attr, key, val in (("property", "og:image", want), ("name", "twitter:image", want),
                           ("property", "og:image:width", "1200"), ("property", "og:image:height", "630"),
                           ("name", "twitter:card", "summary_large_image")):
        got = meta(html, attr, key)
        if got != val:
            fails.append(f"index.html {key} is {got!r}, wants {val!r}")
    return fails, kicker


def fetch(url):
    req = urllib.request.Request(url, headers={"User-Agent": "ridge-city-media-check"})
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            return r.status, r.headers.get("Content-Type", ""), r.read()
    except urllib.error.HTTPError as e:
        return e.code, e.headers.get("Content-Type", ""), b""


def live():
    site = meta(INDEX.read_text(encoding="utf-8"), "property", "og:url")
    fails = []
    status, ctype, body = fetch(site)
    if status != 200:
        return [f"{site} returned {status}"]
    page = body.decode("utf-8", "replace")
    img = meta(page, "property", "og:image")
    if not img:
        return [f"{site} serves no og:image tag: the deploy predates the kit, or the build dropped the tags"]
    if meta(page, "name", "twitter:card") != "summary_large_image":
        fails.append(f"{site} has no twitter:card summary_large_image")
    status, ctype, body = fetch(img)
    if status != 200 or not ctype.startswith("image/jpeg"):
        fails.append(f"{img} returned {status} {ctype or '(no type)'}, wants 200 image/jpeg")
    elif hashlib.sha256(body).digest() != hashlib.sha256((PUBLIC / "og.jpg").read_bytes()).digest():
        fails.append(f"{img} serves different bytes from public/og.jpg: a stale deploy or a CDN copy")
    return fails


if __name__ == "__main__":
    if "--live" in sys.argv[1:]:
        fails = live()
        ok = "live: page tags present, og.jpg is 200 image/jpeg and matches public/og.jpg"
    else:
        fails, kicker = local()
        ok = f"kit: sizes, stills and share tags pass; card and descriptions match the game ('{kicker}')"
    for f in fails:
        print("FAIL", f)
    print(ok if not fails else f"{len(fails)} failure(s)")
    sys.exit(1 if fails else 0)
