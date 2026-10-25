# Frost & Flame — כפור ולהבה

A third-person 3D puzzle-platformer in Hebrew for Israeli grade 7–9 science (particle model and phase changes, grade 7 chapter 2; heat vs temperature, specific heat and latent heat, grade 9 chapter 12). A small explorer with a **heat glove** (right hand, orange) and a **cold glove** (left hand, blue) crosses a frozen observatory island by melting, freezing, boiling and condensing things and by routing heat. Energy is conserved: the cold glove pulls heat out of things into a heat battery, the heat glove spends it.

Built with TypeScript, Vite and Three.js. No backend, no accounts, no runtime network access.

## Run

```bash
npm install
```

```bash
npm run dev
```

Dev server: http://127.0.0.1:5202 (strict port). Other scripts: `npm test` (Vitest), `npm run build` (type-check + static build to `dist/`), `npm run preview` (http://127.0.0.1:4202).

Handy URLs: `?level=3` jumps to level 3, `?all` unlocks every level on the title screen.

## Controls

| | Keyboard | Mouse | Touch |
|---|---|---|---|
| Move | W A S D / arrows | — | left stick |
| Jump (hold in warm rising air to glide) | Space | — | ⤒ |
| Heat glove 🔥 | E (hold) | right button (hold) | 🔥 |
| Cold glove ❄️ | Q (hold) | left button (hold) | ❄️ |
| Particle lens 🔍 | F (hold) or Tab (toggle) | lens button | 🔍 |
| Pause / restart | Esc or P / R | HUD buttons | HUD buttons |

Targeting is automatic: the object in front of the explorer gets a temperature gauge; hold a glove to act on it.

## Levels (implemented)

1. **הפשרה — Thaw**: melt the ice door (the gauge sticks at 0 °C while it melts), freeze the creek into a bridge (the battery fills).
2. **מעלית קיטור — Steam Lift**: ice → water → steam fills a balloon that lifts you; condensing it on a copper plate refills the tank to the same 150 kg.
3. **שבילי חום — Heat Paths**: conduction (copper vs wood through glass), radiation (sun mirror on dark stone vs white snow), convection (warm air carries your glider).
4. **לחץ — Squeeze**: dry ice sublimates with no puddle; an air-filled plunger squishes, a water-filled one opens the gate, an ice-filled one is locked.
5. **מישור — Plateau (grade 9)**: thermometer lifts whose height is the temperature; an ice lift stalls at 0 °C (latent heat); iron rises ~9× faster than water for the same heat (specific heat).
6. **המצפה — The Observatory**: no-hint transfer level with a tight battery; heating everything fails.

Each level gives up to 3 stars: finishing, no falls into the water, and battery left over.

Planned but not built: a no-hint randomised remix of the transfer level, a level select map, voice-over.

## How it is built

- `src/sim/` — authoritative heat model (no Three.js): enthalpy per body, plateaus, mass transfer, conduction, heat battery. 
- `src/game/` — gameplay rules, player controller, entities and the six levels (no Three.js).
- `src/render/` — Three.js world, level view, Tripo models, particles. `src/ui/` — Hebrew RTL HUD, particle lens. `src/audio.ts` — WebAudio synth (no audio files).
- Tests in `tests/`: heat model properties, and every level played by a bot through the same inputs a player uses (solutions, advertised wrong approaches, mass conservation, regressions).
- Automation hooks: `window.render_game_to_text()` and a deterministic `window.advanceTime(ms)`; `scripts/shot.mjs` drives the game headlessly with real keys and captures screenshots.

Docs: [GAME_IDENTITY.md](GAME_IDENTITY.md), [CURRICULUM.md](CURRICULUM.md), [ASSETS.md](ASSETS.md), [PLAYTEST.md](PLAYTEST.md), [progress.md](progress.md), [docs/VISUAL_REVIEW.md](docs/VISUAL_REVIEW.md), [docs/SCIENCE_REVIEW.md](docs/SCIENCE_REVIEW.md), mockups in [docs/visual-targets/](docs/visual-targets/).

## Deploy to Vercel

The build is a self-contained static bundle with a relative base (`base: './'`), so it also works from a sub-path inside the Workbook site.

1. Import the GitHub repo `AceDZN/frost-and-flame` in Vercel (or run `vercel` in this folder).
2. Framework preset: Vite. Build command `npm run build`, output directory `dist` (already in `vercel.json`).
3. No environment variables are needed.

Not deployed yet.
