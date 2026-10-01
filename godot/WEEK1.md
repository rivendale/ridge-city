# Ridge City in Godot: the week-one prototype

Approved 2026-10-01: one city block, one car, a blaster and 20 breakable objects, exported to the web
and tested on a tablet and a laptop before any more content gets built.

Plays at `/proto/godot-week1/` (https://ridgecity.icf.games/proto/godot-week1/ once merged).

## What is in it

- One block: a road loop, sidewalks, six low-poly buildings. The corner shop's door breaks open
  for $150 (plus half a star of heat), and you can walk inside. The till refills after 45 s.
- One car with arcade handling: on foot or driving, a handbrake that lets the tail slide.
- A cartoon foam blaster. A tagged pedestrian or cop sits down dizzy for 3 s, then stands up. Nobody
  dies; there is no blood. Bumping someone with the car does the same. Tagging never pays.
- 20 breakables (5 hydrants, 4 fruit stands, 5 glass panels, 6 cones). Each smash adds half a star.
  Debris is capped at 64 pieces; the oldest piece goes first.
- Heat cools one star at a time after 8 s plus 4 s per star with no new crime.
- HUD: cash, wanted stars with the cool-down, FPS counter, context prompt.

## Controls

| | keyboard and mouse | touch |
|---|---|---|
| walk / drive | WASD or arrows | stick (left half of the screen) |
| fire (on foot) | Space (auto-aims ahead) or click to aim | FIRE |
| handbrake (in car) | Space | BRAKE |
| get in or out, break in | E | ACT |

## Build

Godot 4.7.2 with the matching web export templates. GDScript only, Compatibility renderer, threads off
(no COOP/COEP headers needed).

```sh
cd godot
godot --headless --import
godot --headless --script res://tools/check_scripts.gd     # "checked 13 scripts, 0 failed"
godot --headless --export-release "Web" ../public/proto/godot-week1/index.html
cd .. && npm ci && npm run build                           # Vite copies public/proto into dist/
```

## First-load size (measured 2026-10-01, Godot 4.7.2 export)

| file | raw | gzip -6 | brotli -11 |
|---|---|---|---|
| index.wasm (engine) | 39.51 MB | 10.19 MB | 7.10 MB |
| index.pck (game) | 0.06 MB | 0.06 MB | 0.06 MB |
| index.js and the rest | 0.34 MB | 0.10 MB | 0.09 MB |
| **total** | **39.91 MB** | **10.35 MB** | **7.25 MB** |

Under the brief's 15 MB first-load ceiling if GitHub Pages gzips the wasm. That is not verified for
`application/wasm` on Pages; check after merge with
`curl -sI -H 'Accept-Encoding: gzip' https://ridgecity.icf.games/proto/godot-week1/index.wasm` (expect `content-encoding: gzip`). GitHub Pages serves gzip, not Brotli (checked on another Pages site, 2026-10-01), so the real first load is about 10 MB; the Brotli column is reference only.
If it is served raw, the first load is about 40 MB. The brief's "about 5 MB with Brotli" came from the
Godot 4.3 report; this 4.7.2 template is 7.1 MB with Brotli. Shrinking the engine needs a custom
template build with unused modules disabled, which is out of week-one scope.

## Headless check

`tools/web-check.mjs` (Playwright, Chromium headless shell, SwiftShader) runs a laptop pass at 1280x800
with the keyboard and a tablet pass at 1024x768 with touch. It checks: zero console errors, zero 404s
(including the 200-with-index.html that `vite preview` gives a missing file), the playable scene, a
scripted drive and turn, a ram that smashes and raises stars, a blaster tag and the stand-up after
about 3 s, a break-in that pays $150, walking into the shop, all 20 props breaking with debris never
over 64, the FPS readout, the touch stick, ACT and FIRE. 26 of 26 passed on 2026-10-01.
SwiftShader renders on the CPU, so its 12 to 27 FPS says nothing about a real tablet or laptop.

## Test card for Nick

1. Open https://ridgecity.icf.games/proto/godot-week1/ on the tablet and on the laptop (Chrome or Safari).
2. Walk to the orange car, get in (E or ACT), drive the loop for two minutes, and smash some cones and hydrants.
3. Get out, tag a pedestrian with the blaster (Space, click, or FIRE), and break into the Corner Shop (E or ACT at the door).
4. Report the FPS number top-left after two minutes of driving, how long the first load took, and the device and browser.
5. Report anything that felt wrong: controls, camera, text too small, buttons under your thumbs, or anything boring.
