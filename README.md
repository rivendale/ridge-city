# Ridge City

Top-down open-world crime game for ages **10+**.

You jack parked cars, knock over shops, and shake Ridge City PD. The toy is the crime loop from early GTA — not a shooter and not a preschool errand sim.

Repo: https://github.com/rivendale/ridge-city

Play: https://rivendale.github.io/ridge-city/

## Rating notes

- Crime: car theft, shop alarms, getaways, a wanted system
- Violence: abstract only. Civilians get knocked down and stand back up. Cops pin you → **BUSTED**, not a death screen. No guns. No blood. No “wasted” gore.
- Tone: dry, urban, 10+. Not campy helper-hero.

Closest analog for consequence level: Pizza Tycoon / GTA 1 top-down, not a modern M-rated gunfight.

## Run

```bash
npm install
npm run dev        # http://localhost:5173/ridge-city/
npm run build      # static site in dist/
```

GitHub Pages builds and deploys `dist/` on every push to `main`.

### Controls

| | Keyboard | Touch |
| --- | --- | --- |
| Walk / drive | WASD, arrows or numpad | Stick |
| Jack / bail | E | JACK |
| Act | Space | ACT |
| Slide | Shift | |
| Map | M | |
| Radio jobs | R | |
| Pause | Esc | |

Start next to Mack at the garage. Take jobs from him, or go free and take radio gigs.

## Layout

- `src/game/`: the game (engine, world, drawing, audio, saves, UI).
- `public/game/`: textures and props.
- `public/classic/`: the original single-file version, still playable at `/ridge-city/classic/`. Tag `classic-2026-09-20` marks it.
- `public/sw.js`: retires the classic version's cache-first service worker for returning players.

The current game began as a Grok Build export (October 2026) and is maintained here from now on.
