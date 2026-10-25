# Visual review — mockups vs real gameplay

Targets: ChatGPT (gpt-image) mockups in `docs/visual-targets/` (prompts in `PROMPTS.md`). They are design targets, not evidence of the game. Actual captures: `docs/captures/*-actual.png`, taken from the running game at the mockups' viewport (1672×941) with real keyboard input through `scripts/shot.mjs` (headless Chrome on the Mac's GPU), at the same moment of play. Hebrew in the mockups is often garbled; we copied layout, not text.

| # | Target | Actual | Moment |
|---|---|---|---|
| 01 | `visual-targets/01-first-30s.png` | `captures/01-first-30s-actual.png` | Level 1, holding E at the ice door, mid-melt |
| 02 | `visual-targets/02-steam-lift.png` | `captures/02-steam-lift-actual.png` | Level 2, riding the balloon basket while the basin boils |
| 03 | `visual-targets/03-oops.png` | `captures/03-oops-actual.png` | Level 3, heating the wooden rod by mistake |
| 04 | `visual-targets/04-lens-hud.png` | `captures/04-lens-hud-actual.png` | Level 5, big ice lift stuck at 0 °C, particle lens held |

## What matches

- **Camera**: third-person chase from behind and above the explorer, explorer in the lower middle of the frame, the target ahead (01, 02, 03).
- **Hero silhouette**: the rigged Tripo explorer (teal parka, fur trim, goggles, orange right glove, blue left glove) with a glowing brass battery backpack added in code to match 01/04. Idle, run, jump, aim and cheer clips play in gameplay.
- **HUD hierarchy and RTL**: round brass buttons top-left (pause, sound, restart, lens — the lens button lights up like 04's); brass level plaque + objective top-right (`שלב 1 · הפשרה`, `הגיעו למגדלור` with lighthouse icon); `סוללת חום` battery bar bottom-centre with an LTR MJ value; thermometer + °C readout + phase chip + plateau progress ring (`התכה… 52%`) on the target; touch layout (stick left, 🔥 ❄️ ⤒ right) at phone width.
- **Particle lens (04)**: brass ring split down the middle — liquid particles sliding on one side, a vibrating bonded lattice on the other — with `0 °C` on top, `נוזל` / `מוצק` side tags and a locked mass tag at the bottom (`🔒 מסה: 1000 ק״ג · H₂O`). This is the closest match.
- **Steam lift (02)**: the explorer stands in the Tripo balloon's basket while the envelope swells; a hose runs from the boiling basin; white droplet clouds rise from the basin; the gauge reads 100 °C with a רתיחה ring.
- **Palette**: violet-blue sky to orange horizon, low warm sun, black basalt, snow, brass, warm lamp light; the Tripo observatory dome as a landmark; a lighthouse as the exit beacon.

## Material differences that remain (honest)

1. **Scene density and finish.** The mockups are painterly, densely dressed cliffs with wet reflective rock, icicles everywhere, waterfalls and rim light. The game uses procedural boxes with lumpy rock sides, flat snow tops and scattered boulders. It reads as the same world but plainer. (Improved once: the long flat wall in level 1 was split into rock pillars with low rocks beyond so the sea and sky open up, and textures now tile.)
2. **Gauge placement.** The mockups pin the thermometer cluster to the top of the screen on a stalk; the game anchors it beside the target object, which keeps it readable when the camera moves. Deliberate.
3. **Heat beam.** Mockup 01 shows a single bright continuous flame beam; the game uses a stream of orange sparks (heat glove) and blue frost motes flowing *into* the cold glove. Thinner and less dramatic than the target.
4. **Melting look.** Mockup 01 shows a cracked, dripping ice arch with a waterfall; the game's door shrinks from the top with glowing cracks, drips and a splash. No sculpted cracks or meltwater sheet.
5. **Level 3 "oops" (03).** The mockup frames the wooden and copper rods side by side through one glass pane at close range with a "?" thought bubble; the game shows the wooden rod smoking and the gauge at 180 °C from the chase camera, with no thought bubble. The lesson (wood's near end gets hot, the far end and lock don't change) is visible on the rod colours and the gauge.
6. **Lens context (04).** The mockup holds a hand magnifier in close-up; the game uses a screen-space lens over the target with the world dimmed.
7. **Mockup 02's steam plume** is labelled "טיפות מים" in-world; the game says it in the boiling toast and the level takeaway instead of a floating label.
8. **Desktop keys legend** (bottom-left) is not in the mockups (they show the touch stick); it is hidden on touch devices.

## Not verified

- Real-GPU frame rate on low-end laptops and phones (headless Mac GPU only; the in-game FPS counter is in `render_game_to_text`).
- How the scene looks on a real phone screen (only 390×844 headless captures).
