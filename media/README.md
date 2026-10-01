# media/

Sources for the Ridge City media kit. What ships is in `public/`: `og.jpg` (1200x630 share card),
`banner.jpg` (1200x264), `icon-512.png` and `icon-180.png`.

| file | what |
|---|---|
| `SHOTLIST.md` | the shot list, written before capture, and how each still was made |
| `capture.mjs` | Playwright script that plays the live game and takes the stills and key art |
| `screens/` | six 1280x720 gameplay stills |
| `keyart.png` | the chase frame the card and banner are cut from |
| `compose.py` | builds the card, banner and icons (Pillow, Inkscape CLI) |
| `icon.svg` | the app icon: the game's radar ring and the favicon's wanted star |

Rebuild: `python3 media/compose.py`. Recapture: copy `capture.mjs` next to an install of `playwright-core`
and run `node capture.mjs <outdir> [shot ...]`.

Provenance: every image is the game's own render or drawn here in SVG. No AI-generated assets. Fonts are
the game's own, Barlow Condensed and IBM Plex Sans (SIL Open Font License), fetched from Google Fonts at
build time and not stored in the repo. `public/game/splash.jpg` (from the Grok export) is not used.

Rating: 10+ (cartoon, no gore, no guns). Nothing here shows more than the game shows.
