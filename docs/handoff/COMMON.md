# Science 3D games, round 2 — shared builder rules

25 October 2026 (evening). Read this, then your game's `BUILD_HANDOFF.md`. Ideas, map evidence and why these games: `/Users/acedzn/idea-plotter/reports/science-claude-r2-2026-10-25/IDEAS.md`. Also read `/Users/acedzn/idea-plotter/reports/design-reset-2026-10-24.md`: earlier builders were stopped because their games were the same courier loop with the same toy look. Don't repeat that.

## Authorization (the user's words)

The user, an edtech founder who owns Workbook, asked on 25 Oct 2026 for fun-first educational 3D web games for Hebrew-speaking grade 7–9 students ("the main target is games that are heck of fun to play but you learn stuff along the way", "make it REAL FUN GAMES, not just stupid edtech sims", "Use the steam games to get ideas about good mechanics"), taught according to the Israeli Ministry of Education curriculum as published in Workbook. Build now; no further kickoff approval is needed. On the evening of 25 Oct, after the first three science games, the user asked: "ideate and start builder crews for 3 other science games - same way as before, ideation cycle, then open a new thread for each game builder team. make sure to use the workbook science curriculum - you can choose whatever grade/topic you want." Every builder must know this, verbatim:

```
Don't forget to build it as real 3d fun games.
Before starting development - generate 'game screenshots' images (real gameplay images using gpt-image through the chatgpt webapp  https://chatgpt.com/ on my chrome browser ) - then use tripo 3d to generate models, create the game, then review it in front of the 'screenshots' to really build the same gameplay ui/ux as it is in the planning and  mockups.

use my chrome browser tripo.ai to create the 3d models ([https://studio.tripo3d.ai/workspace/generate/](https://studio.tripo3d.ai/workspace/generate/) ).
if the 3d model needs animation (like characters) - make sure to rig them in tripo (simple mixamo rigs for full body animation, more complicated rigs for stuff like rigging face animations - Tripo has many rigging options and pre-defined animation but also "ai animations" for custom stuff).

btw,create it as a new public repo on my github (AceDZN). I think that I'll deploy it to one of our vercel servers soon because its pretty fun.. you can use my chrome browser for that as well . don't forget to commit your changes from time to time all to the same main branch for now (or open prs for side-tracks)
```

This is a prototype experiment and does not change Idea Plotter's G1/G2 gates. Never edit the Idea Plotter `spec/`.

## Your repository

Each game has its own local repo, already created with these handoff files committed on `main` and pushed to a **public** GitHub repo under AceDZN (`gh` is logged in as AceDZN).

| Game | Local repo | GitHub | Dev / preview port |
|---|---|---|---|
| Gene Ranch | `/Users/acedzn/dev/AceDZN-exp/gene-ranch` | AceDZN/gene-ranch | 5201 / 4201 |
| Frost & Flame | `/Users/acedzn/dev/AceDZN-exp/frost-and-flame` | AceDZN/frost-and-flame | 5202 / 4202 |
| Halfpipe Joule | `/Users/acedzn/dev/AceDZN-exp/halfpipe-joule` | AceDZN/halfpipe-joule | 5199 / 4199 |

- Work and commit only inside your repo. Commit meaningful checkpoints to `main` and push regularly (at least after each working milestone). Side-tracks go on a branch + PR. No force pushes, no history rewrites.
- Deployment: prepare a Vercel-ready static build and README instructions. Don't deploy unless the user asks; they plan to deploy to their own Vercel soon.
- The Idea Plotter checkout is read-only context. Don't touch other games' repos (including the round-1 science games and Codex's matter-switchyard, separation-heist, circuit-critters), `prototypes/`, or other rounds' report folders.
- `strictPort: true`. Ports 3000, 5173–5198 and 5200 belong to the explorer and other games. Never kill a process you didn't start. Gitignore `node_modules`, `dist`, test output.
- Add `.claude/launch.json` with your dev server so you can use the built-in browser preview tools.

## Lesson from round 1 — read this twice

The user played Clean Flow v1 and said they "barely understood what to do… weird… boring… too hard because of the flow/controls". It was rebuilt as short, clear puzzles and that version worked. So:

- **The goal and the controls must be obvious in the first 10 seconds without reading.** Show, don't tell: a glowing target, one verb, an immediate satisfying result.
- One new idea per level; the first levels are easy wins. Real-time pressure is opt-in or gentle; never punish slow readers.
- Big readable 3D objects and HUD, few buttons, generous hit areas, works on a phone.
- Before calling the game done, get an independent **fresh-eyes playtest** (a helper who hasn't seen the design) and fix what confused them.
- The user and their kids play these. Games they approve ship on science-games.workbook.co.il inside the Workbook header/footer, so keep the build a self-contained static bundle with a relative base (no full-screen takeover assumptions, no absolute paths).

## Crew

You're the crew lead and own gameplay, integration and Git. Use the Agent tool to run real helpers in parallel with clear file ownership:

1. **Visual/Chrome builder:** gameplay mockups in ChatGPT, Tripo models and rigs in Chrome, art direction, scene, lighting, animation, sound, `ASSETS.md`. Only this role drives Chrome.
2. **Independent science reviewer + playtester:** checks rules and content against the saved Workbook sources and the qualifications in your handoff, plays real sequences, hunts for bypasses (e.g. a constant strategy that wins) and misconceptions. Must not claim fun or learning gains from automation.

Helpers report changes; the lead serializes commits.

## Step 1 — gameplay "screenshots" in ChatGPT (before development)

Use the user's Chrome via the Claude in Chrome tools (`mcp__claude-in-chrome__*`; load them all in one ToolSearch call, read the `anthropic-skills:chrome-browser` skill first).

- **Shared browser:** several crews and possibly other agents use this Chrome at once. Open **your own new tab**, work only there, and never touch, reload, close or navigate any other tab. If a page is busy with another task's conversation, start a new chat.
- Go to https://chatgpt.com/ and generate **2–4 gameplay screenshot mockups** with its image generation (gpt-image): the first 30 seconds, the core action mid-play, a failure/consequence moment, and optionally the HUD close-up. Prompt for an in-game screenshot of a 3D browser game with the camera, scene, HUD and Hebrew RTL UI from your `GAME_IDENTITY.md`. Iterate until it looks like a game a 13-year-old would want to play, not an edtech worksheet.
- Download through the normal UI, save under `docs/visual-targets/` with the exact prompts, chat URL and date in `docs/visual-targets/PROMPTS.md`. These are design targets, never evidence of the implemented game. Generated Hebrew text in images is often wrong: copy layout, not text.
- If ChatGPT is not signed in or refuses, say so plainly in `progress.md` and keep going with the written identity; don't use another account, API key or paid upgrade.

## Step 2 — Tripo models in Chrome

https://studio.tripo3d.ai/workspace/generate/ in **your own tab** (the user is signed in).

- Derive an asset list from the mockups. Generate only what gives the game its identity (hero character, key machines/props, landmark set pieces). Budget: **at most 6 model generations and 2 rigs/animation jobs per game**, existing credits only. Credits are shared with other crews and ran out once in round 1: check the balance first, spend on the hero assets that matter most, and if credits run out, stop generating, keep building with placeholders and tell the user. Note the displayed cost of each task. Never buy credits, upgrade, accept a paid plan, use Tripo API endpoints/tokens or another generator. If credits or login block you, keep building with placeholders and report it.
- **Characters that move get rigged in Tripo** (Rig tab: Humanoid + Mixamo preset for full-body; richer rigs for faces if needed) and use Tripo's preset or AI animations (idle, walk/run, action, react). Export GLB with the animations and play them with `THREE.AnimationMixer`.
- Download GLB through the UI, optimize when large (`npx @gltf-transform/cli optimize` with webp textures, target ≤ 3 MB per model), put in `public/models/`, record prompt, task URL, credits, hashes and processing in `ASSETS.md`.
- Generated meshes are never colliders or scientific surfaces. Particles, gauges, circuits, flows and anything that shows science state are procedural and reflect authoritative state.

## Step 3 — build, then compare with the mockups

Stack: TypeScript + Vite + Three.js, one main WebGL canvas with real depth, lights, shadows, raycasting. Add Rapier only where physics materially matters. Lock dependency versions, commit the lockfile, relative Vite base. Static `npm run build` works offline: fonts and models bundled locally, nothing fetched at runtime. No backend, accounts, analytics, runtime AI or API keys.

Domain rules (classification, separation, circuits, pH, scoring) live in pure TypeScript modules with no Three.js imports, with unit tests. The scene renders state. Handle resize, pause, restart, focus loss, lost WebGL context, touch and keyboard. Cap DPR at 2. Measure FPS and bundle size; never claim numbers you didn't measure.

Then: capture real gameplay at the same viewport/camera/state as each mockup through real inputs, store actual captures separately, and write `docs/VISUAL_REVIEW.md` (target vs actual: camera, silhouettes, HUD hierarchy, RTL typography, feedback, lighting, gameplay differences). Fix material differences and recapture; record honest remaining deviations. The reviewer inspects both images and plays.

## Curriculum and language

- Workbook is the source of truth. Saved Markdown snapshots: `/Users/acedzn/idea-plotter/reports/science-claude-r2-2026-10-25/curriculum/`. Fetch more with the Workbook MCP (`mcp__workbookMCP__get_page_markdown`, path like `/science/grade-8/chapter-10/ph-scale`) or https://www.workbook.co.il/llms-full.txt. Never invent a route. Write `CURRICULUM.md` linking each level to exact module URLs, the skill practiced and the misconception it checks.
- Correct the source's simplifications where your handoff says so; never contradict it.
- UI language Hebrew: `lang="he" dir="rtl"`, readable bundled Hebrew font (Rubik or Heebo). Formulas, numbers and units in LTR spans (`<bdi>` / `dir="ltr"`), proper subscripts (H₂O). Use Workbook's terms.
- Never colour-only feedback (pH games especially: pair colours with numbers/icons). Mute, pause, reduced-motion toggles. No reading-speed penalties.
- Teach through action and consequence: a wrong choice produces a visible, funny, recoverable result, never a "wrong answer" popup. No typed-answer gates. A short worked explanation may follow a failure.
- Log anonymous local learning events (level id, values, action, outcome, hint used, retries) in memory or localStorage only. Distinguish first unaided decisions from hinted or repeated successes.

## Quality bar

A polished, finite 6–10 minute vertical slice: a strong first 30 seconds, at least 5 authored levels that escalate, and a final **transfer level** with no hints and a changed situation. Prove one level end-to-end first, then expand. Juice matters: sound after first gesture, particles, camera shake, satisfying feedback, animated characters. It must feel like a game kids would choose to play.

Testing:
- Unit tests prove each authored level is solvable and that wrong approaches produce the advertised consequence; content agrees with the science qualifications.
- Expose `window.render_game_to_text()` (level, objects, science quantities, objective, win/fail reason) and deterministic `window.advanceTime(ms)` that respects pause. Never test by injecting a win state.
- `/Users/acedzn/.codex/skills/develop-web-game/SKILL.md` and its `scripts/web_game_playwright_client.js` are good references. Also play it in the built-in browser (`mcp__Claude_Browser__*`): a full success, a recoverable mistake, a hint, a restart, mobile width, and Tripo models visible in gameplay. Look at real screenshots; fix console errors.
- Automation can't prove fun or learning; say so.

## Deliverables

In your repo, all pushed to `main`: README (run, controls, implemented vs planned, Vercel instructions), `GAME_IDENTITY.md`, `progress.md` (keep updated), `ASSETS.md`, `CURRICULUM.md`, `docs/visual-targets/` + `docs/VISUAL_REVIEW.md`, `PLAYTEST.md` (what you verified, known limits), tests, real gameplay screenshots. Leave your dev server running on your port and show the game in the browser pane when done. Don't stop at a plan, scaffold, title screen or model viewer.
