# media/

Sources for the Ridge City media kit. What ships is in `public/`: `og.jpg` (1200x630 share card),
`banner.jpg` (1200x264), `icon-512.png`, `icon-192.png` (both in the manifest, for Chrome's install
prompt) and `icon-180.png` (iOS).

| file | what |
|---|---|
| `SHOTLIST.md` | the shot list, written before capture, and how each still was made |
| `capture.mjs` | Playwright script that plays the live game and takes the stills and key art |
| `screens/` | five 1280x720 gameplay stills (the plan's shot 5, the map, was dropped; see `SHOTLIST.md`) |
| `keyart.png` | the chase frame the card and banner are cut from |
| `compose.py` | builds the card, banner and icons (Pillow, Inkscape CLI) |
| `check.py` | checks the kit (sizes, stills, share tags, rating), and with `--live` the deployed site |
| `icon.svg` | the app icon: the game's radar ring and the favicon's wanted star |

Rebuild: `python3 media/compose.py`, then `python3 media/check.py`. Recapture: copy `capture.mjs` next to an
install of `playwright-core` and run `node capture.mjs <outdir> [shot ...]`.

Provenance: every image is the game's own render or drawn here in SVG. No AI-generated assets. Fonts are
the game's own, Barlow Condensed and IBM Plex Sans (SIL Open Font License), fetched from Google Fonts at
build time and not stored in the repo; `compose.py` pins each download by sha256 and refuses a different
file, so a rebuild reproduces `og.jpg` and `banner.jpg` byte for byte. `public/game/splash.jpg` (from the Grok export) is not used.

## Rating

The card's top line is read from the game's own start card (`src/game/RidgeCity.tsx`, the `kicker`), so the
card can never say a different age from the game. Today both say `AGES 10+ · NO GORE` (cartoon, no gore, no
guns), and nothing here shows more than the game shows.

The rating is baked into `public/og.jpg`, and share platforms cache the image. When the game's start card
changes (the studio has Ridge City moving to 10-13, cartoon violence):

1. edit the three share descriptions in `index.html` (`description`, `og:description`, `twitter:description`)
   to the new age; `compose.py` refuses to build until they agree with the game;
2. `python3 media/compose.py`, then `python3 media/check.py` (it fails while `og.jpg` still carries the old line);
3. ship, then do the re-scrape step below.

## Ship

The tags point at `https://ridgecity.icf.games/og.jpg`. A local preview proves the tags exist, not that the card
appears when the link is shared. After each deploy that changes the card or the tags:

1. `python3 media/check.py --live`: the live page carries the tags, and its `og.jpg` returns 200 as
   `image/jpeg` with the same bytes as `public/og.jpg`. Before the kit is deployed it fails, by design.
2. Paste https://ridgecity.icf.games/ into a share debugger or a private chat and look at the card.
3. Force a re-scrape anywhere the link was already previewed: the page shipped without share tags until the kit
   landed, so those platforms cached a card with no image.
