# Assets and licenses: Godot week one

Every visual in the week-one prototype is built at runtime from Godot primitives in GDScript
(`scripts/art.gd` and the scene scripts). There are no imported models, textures, sounds or fonts
besides the ones listed here, and no assets with unclear licenses.

| asset | where | source | license |
|---|---|---|---|
| City block: roads, sidewalks, dashes, crosswalk, hedges | `scripts/main.gd` | made for this project from `PlaneMesh` and `BoxMesh` | same as this repo |
| Six buildings, window bands, roofs, AC units, the corner shop interior and door | `scripts/main.gd` | made for this project from `BoxMesh`, merged with `SurfaceTool` | same as this repo |
| Lamp posts and trees | `scripts/main.gd` | made for this project from `BoxMesh` and a low-poly `SphereMesh` | same as this repo |
| Car | `scripts/car.gd` | made for this project from `BoxMesh` and `CylinderMesh` | same as this repo |
| Player and the toy foam blaster | `scripts/player.gd` | made for this project from `BoxMesh` and `SphereMesh` | same as this repo |
| Pedestrians, cop, dizzy stars | `scripts/pedestrian.gd` | made for this project from `BoxMesh` and `SphereMesh` | same as this repo |
| 20 breakables: hydrants, fruit stands, glass panels, cones, and their debris | `scripts/breakable.gd`, `scripts/game_state.gd` | made for this project from primitives | same as this repo |
| Ink outlines, blob shadows, water and paint particles | `scripts/art.gd` | made for this project (inverted hull, `GradientTexture2D`, `CPUParticles3D`) | same as this repo |
| HUD, stars, touch controls | `scripts/hud.gd`, `scripts/touch_controls.gd` | drawn in code | same as this repo |
| App icon | `icon.svg` | drawn for this project | same as this repo |
| UI and sign font | engine built-in | Open Sans, bundled inside Godot | SIL OFL 1.1 (listed in `godot-COPYRIGHT.txt`) |
| Engine | `public/proto/godot-week1/index.wasm`, `index.js` | Godot 4.7.2-stable official web template (`web_nothreads_release`), SHA512 of the template archive checked against the release's `SHA512-SUMS.txt` | MIT; notice in `public/proto/godot-week1/godot-LICENSE.txt`, bundled third-party notices in `godot-COPYRIGHT.txt` |

No Kenney, Quaternius or other third-party art is used yet. When a pack is added, add a row with its
URL, version and license (CC0, CC-BY with credit, MIT/Apache code or OFL fonts only).
