# Changelog

All notable changes to Ridge City are listed here, newest first.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## 2026-11-01

### Added

- On-foot camera zooms in (~1.55×) so you and nearby targets are readable; driving stays at the wide view.
- Mack gets a bright orange ground ring and a clearer label so he is easy to spot.
- Guided first three jobs (Find Mack → jack a car → Hit SLICE CO.) with step toasts and cash pop-ups.

### Changed

- Beginner arrest grace. On Beginner, the first arrest of a session is a warning instead: the heat clears, you keep your cash, and the screen says "Let off with a warning · next time it's a fine". It doesn't apply during evade jobs or the finale. Cops on Beginner also need a little longer to pin you (about half a second more), so the "They're on you · run" warning has time to work. Play-through bots were arrested about 40 seconds in on Beginner, before reaching Mack. Experienced is unchanged.

## 2026-10-31

### Changed

- Sound and the radio are now on by default (they used to start off, so most players never heard the game). Audio still only starts when you press Beginner, Experienced or Continue, as browsers require. Settings turns either off, and the choice is saved. Settings now save under `ridgecity-settings-v3`; an older save keeps its camera-shake choice and moves to sound on.

### Fixed

- Phone held sideways: the start menu now fits the screen, so Beginner, Experienced and Settings are always visible and the game can be started. Menu text scrolls above the buttons instead of pushing them off screen.
- Phone held upright: Settings is no longer cut off at the bottom of the start menu.
- Phones and tablets: the in-game Map and Settings buttons no longer sit on top of the touch pad's MAP button. They now sit just under the radar (or beside it on a sideways phone) and are a bit bigger, so they're easier to tap.
- Menus (start, pause, settings, garage) keep their buttons pinned at the bottom of the card and scroll smoothly by touch on small screens.
