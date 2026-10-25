# progress — Frost & Flame / כפור ולהבה

## 25–26 Oct 2026

- **Handoff read** (COMMON, BUILD_HANDOFF, IDEAS, Workbook snapshots, round-1 notes). Wrote `GAME_IDENTITY.md` first so the visual helper could start.
- **Mockups (ChatGPT, user's Chrome, visual helper):** 4 gameplay targets in `docs/visual-targets/` (first 30 s, steam lift, oops, lens/HUD) + 6 reference images for Tripo. Prompts and notes: `docs/visual-targets/PROMPTS.md`.
- **Tripo (visual helper):** explorer (rigged Mixamo, clips idle/run/jump/aim/cast_a_spell/cheer), observatory, balloon, thermo-lift, sun mirror, plunger. 220 credits by displayed price (6 generations + 1 rig + 1 AI animation; presets showed no price). Details in `ASSETS.md`.
- **Heat model** (`src/sim/`): enthalpy bodies with plateaus, mass transfer between bodies, conduction (one shared speed-up), heat battery gloves with energy conservation.
- **Gameplay core + 6 levels** (`src/game/`), all pure TS; a test bot plays each level through the same inputs a player uses.
- **Renderer/HUD**: golden-hour island, brass Hebrew RTL HUD matching the mockups, world-anchored temperature gauge with plateau ring, hints, particle lens, touch controls, WebAudio synth, camera that rises over walls.
- Fixes found by playing in the real renderer: overlays ignoring `[hidden]`; false "sublimation" toast from a near-empty body; freezing shown as "melting"; walls hiding the explorer; heat glove re-targeting the balloon after boiling dry; **cold glove farming ~400 MJ from the already-frozen glacier** (now: the cold glove only cools things down to the air temperature); melting walls never showing their 0 °C plateau ring; phone-width layout.
- **Port note:** port 5202 is held by another project's dev server (`clockwork-alibi`, not started by this crew). I didn't kill it; the lead session was asked. Meanwhile the game runs on a temporary port (see the final report).

## Open / next

- Independent science review → `docs/SCIENCE_REVIEW.md` (in progress).
- Fresh-eyes playtest → `PLAYTEST.md` (in progress).
- Visual review against the mockups → `docs/VISUAL_REVIEW.md`.
