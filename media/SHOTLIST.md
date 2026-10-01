# Ridge City media kit v1: shot list

Written before capture (Media Studio step 1). Stills only; Nick sees these before any trailer is cut.
Rating rule for every frame: 10+, cartoon, no gore, no guns. Show only what the game shows.

| # | file | the moment | why it sells | setup |
|---|---|---|---|---|
| 1 | `01-mack.png` | On foot at Mack's garage lot, late afternoon, Mack's marker lit, a parked coupe beside him | the hook: a person to work for and a car right there | new game, walk to Mack, talk for the first job |
| 2 | `02-jacked-car.png` | Driving a jacked sport car through downtown at dusk, headlights on, skid marks behind | the core toy: take a car and go | warp beside the downtown sport car, jack it, hold W, slide with Shift |
| 3 | `03-shop-alarm.png` | Knocking over a shop at night: the alarm ring, the crowd scattering, the cash toast | crime with a payoff, nobody hurt | on foot at a shop door, Space |
| 4 | `04-wanted-cruiser.png` | Three wanted stars, cruisers on the tail with lights, heat meter filling | the chase | in a car, 3 stars, drive away from the cruisers |
| 5 | `05-map.png` (dropped, see below) | The city map: districts, jobs, your cars on the radar | it is a real open city | M |
| 6 | `06-garage.png` | Rolling into Mack's garage bay to lose the heat | the escape and the payoff loop | drive into the bay with stars on |

## How they were captured (2026-10-01)

Playwright (playwright-core, headless Chromium, SwiftShader GL) against the live site
https://ridgecity.icf.games/. Viewport 960x540 at device scale 4/3, so each frame is 1280x720 and shows
what a laptop at 125-150% display scaling shows; at 1280x720 and scale 1 the cars were too small to read.

- A crafted save sets the time of day and puts the player in free roam, so no job arrow points off-screen.
  Shot 1 is a real new game (Beginner) instead.
- The game's own test hook (`window.__ridgeCity`: `warp`, `setWanted`, `forceRadio`) places the player and
  sets the heat. Driving, jacking, robbing and sliding are real key presses. The map's two yellow cars were
  bought at Mack's through the garage menu.
- The keyboard help strip (`.controls-hint`) is hidden in every shot. The control-hint bubble (`.hint`) and the
  free-roam job panel (`.hud-mission`, "FREE / City's open. See Mack for a job...") are hidden in shots 2, 3, 4
  and 6: the panel was the same in all four and covered the road in the chase, and in 6 the hint said
  "SLOW DOWN · hide in the garage" over a car already parked. Shot 1 keeps both; its panel is the first job.
  Everything else on screen is the game's renderer and HUD.

Script: `media/capture.mjs`. Picks went to `media/screens/` under the names above. Shots 2, 3, 4 and 6 were
recaptured the same day after the stills review, with the panel and hint hidden.

## Where the picks differ from the plan

- 1: the pick is the moment before talking to Mack; talking ends the opening job and its toast covers the lot.
- 3: the game draws no alarm ring. The alarm reads through the toast, the scattering crowd and the cruiser rolling in.
  The recapture's pick is the Mart in the East End, the take that had all three.
- 5: dropped. Most of the frame was a flat grid of identical blocks, and the game draws some labels on top of
  each other ("MARKET" and "PAY SPRAY" run together; marker dots sit on "CITY HALL"). The spec allows 4 to 6
  stills. The label collisions are the game's to fix, not the kit's; `capture.mjs` keeps the `map` shot as an alt.
- 6: the car is already in the bay with the heat cooling. Driving in with cruisers close behind ended in an
  arrest in most takes.

## Key art for the card and banner

`media/keyart.png` is one 1920x1080 frame of the chase (shot 4's moment) at device scale 2 with the DOM HUD
hidden. `media/compose.py` crops it for `public/og.jpg` and `public/banner.jpg`; the canvas radar in the
top-right corner falls outside both crops.
