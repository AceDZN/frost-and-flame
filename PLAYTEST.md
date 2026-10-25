# PLAYTEST — Frost & Flame / כפור ולהבה

What was verified, how, and what was not. Automation cannot show that the game is fun or that students learn from it; only real students playing can.

## Verified

- **Unit tests (`npm test`, Vitest): 50 passing.**
  - Heat model: plateaus at 0 °C, 100 °C and −78.5 °C; Q = m·c·ΔT and Q = m·L; mass never changes in a phase change; energy is conserved through conduction, mass transfer and the glove battery; the gloves stop at an empty or full battery and at temperature limits; conduction never overshoots.
  - Every level is played by a bot through the same `Input` a player produces (move, jump, heat, cold): each is solved, and the advertised wrong approaches fail. Examples: heating the creek makes no bridge; heating the condenser doesn't refill the tank; the wooden rod's far end stays cold; the white snow latch never melts; ice in the pipe locks the plunger; the big ice lift and the water lift can't get there on the battery; "heat the glacier" empties the battery in level 6.
  - Water mass is conserved over a minute of random play in every level.
  - Regressions:
    - The cold glove can't farm energy from things already at air temperature.
    - The heat glove doesn't jump to the balloon after boiling the basin dry.
    - Run-jump sweeps prove neither creek can be jumped; the sweep fails on the old 4.2 m creek.
    - The level 6 dome is sealed while its latch is frozen.
    - Boiling never announces condensation.
    - The water-system total stays constant.
    - Rods use the shared conduction scale.
    - The glove can't reach the creek through the ice door.
- **Real game, real keys:** `scripts/shot.mjs` drives the running game in headless Chrome on the Mac's GPU with real keyboard events and deterministic `advanceTime`. Every level was won from start to exit this way (final run, after all fixes: L1, L3, L4 and L5 won; L2 won with 3★; L6 won with 3★ and 62 MJ left), with zero console errors. Also exercised: recoverable mistakes (falling in the creek, the balloon rising without you, the wrong plunger, the big ice lift draining the battery and getting it back by refreezing), hints, restart, the particle lens, and phone width (390×844 with touch controls).
- **Frame rate:** `scripts/fps.mjs` measured 120 fps (the display cap) on all six levels at 1600×900 on this Mac (Apple M2 Max, headless Chrome with Metal). Not measured on low-end laptops or phones.
- **Build:** `npm run build` makes a static bundle with a relative base. It is 772 kB of JS (205 kB gzipped) plus 6.0 MB of models with WebP textures. Nothing is fetched at runtime.

## Independent science review

Full report: `docs/SCIENCE_REVIEW.md`. The reviewer confirmed the model and every energy budget by hand. Every finding was handled; see the resolution table there.

## Fresh-eyes playtest

A helper who hadn't seen the design or code played every level from the screen only (report in the shared notes folder, `frost-flame-playtest.md`). They finished all 6 levels: L1 3★, L2 3★, L3 won, L4 2★, L5 3★, L6 3★. Every deliberate mistake was recoverable. Their best moments were the convection glide, the battery refilling when water freezes, and getting all 200 MJ back by refreezing the big block. The game hot-reloaded during their session, so some early observations predate fixes.

| # | Confusion they reported | Fix |
|---|---|---|
| 1 | The camera ended up inside the balloon (L2, L6), inside door-frame walls (L1) and behind the L5 lift: "played blind" | The camera rises over occluders, then pulls in toward the explorer. The balloons, thermometer towers, observatory and lift platforms all count as occluders. |
| 2 | Couldn't see or control the glove target: L6 creek card shown while the glove said "blocked"; a 0.1 s step flipped the target; L2 heated the copper plate above instead of the basin | A glowing ring marks the target. Anything behind rock or an ice wall is never offered; glass and barred gates still are, because they teach "the glove needs a clear line". Selection is sticky while the target stays in front. High targets are penalised, the hinted object wins, and the condenser can't be worked from the balloon. |
| 3 | Text piled up: the level banner hid the first hint, toasts stacked three deep and stayed 40 s, hint boxes clipped at edges or covered the battery | The level banner is gone (the plaque says it). Toasts run on game time, at most 2 at once. Hint and gauge boxes are clamped on screen; the hint text no longer squeezes into a column on phones. |
| 4 | No feedback for plausible wrong choices: white mirror button, E aimed at nothing, battery draining "too fast to notice" | New toasts: the white snow reflects almost all sunlight; the dark stone absorbs it; nothing here to heat or cool; a quarter of the battery left. |
| 5 | Words: "המראה" read as "the mirror"; lens hold-or-tap unclear; the lens drawn half/half at 27 % ice; win text too dense | The toast now says "מעבר ישיר ממוצק לגז (המראה)…" and the ring reads "מוצק→גז". The legend says "F החזיקו · Tab קבוע". The lens divider follows the real phase fractions. The win card shows one line plus a "למה?" toggle. |
| — | L6: falling into the creek respawned at the level start | Checkpoints added at the plug passage and at the creek bank. |
| — | L2: cooling the plate while still on the balloon sank you with the water in the tank (needed R) | The condenser is no longer a target while you stand on the balloon. |

## Known limits

- Fun and learning are unproven until students play.
- Not tested on real phones or tablets, or on low-end GPUs. Audio was not checked by ear (the WebAudio graph runs without errors).
- The visuals are plainer than the painterly mockups; see `docs/VISUAL_REVIEW.md`.
- Some feedback is still text: the toasts and win card are Hebrew-only, with no voice-over.
- Two levels lean on short reading: the L4 plunger messages and the L5 lift hints. Hints appear after 9 s in levels 3–5 and never in level 6.
- The energy numbers are honest, but the scale is game-sized: 100 MJ/s gloves, conduction sped up ×30,000 (both stated in the game), and a game-scaled sun mirror (in CURRICULUM.md).
