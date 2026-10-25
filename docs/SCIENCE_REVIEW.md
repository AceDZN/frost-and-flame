# Science review — Frost & Flame / כפור ולהבה

Independent science review against the Workbook snapshots in `docs/curriculum/` and the "Curriculum" section of `docs/handoff/BUILD_HANDOFF.md`.

- **Reviewed:** commit `cbe7ea6` (plus an uncommitted camera-only change in `src/main.ts`), 2026-10-26. The tree changed three times during the review (`f2f046e`, `de90cab`, `cbe7ea6`). Every finding below was re-checked on `cbe7ea6`.
- **How:** read the model, rules, levels and UI strings; recomputed every energy budget by hand; ran `npx vitest run` (43/43 pass); played sequences headlessly through the same `Input` the keyboard produces (probe scripts kept outside the repo); confirmed the two P0s in the running game with real key presses (`scripts/shot.mjs` against the dev server). Screenshots are in the side-session notes folder `frost-flame-review/` (not in the repo).
- **Scope:** science, numbers, wording, exploits and test coverage only. Nothing here is a claim about fun or about learning gains; automation can't show either.

## Summary verdict

**The thermal core is right. Two level-geometry bypasses must be fixed before this is used in a classroom.**

- **Model: correct.** The enthalpy model gives exact `Q = m·c·ΔT` and `Q = m·L` with textbook constants. Plateaus sit exactly at 0 °C, 100 °C and −78.5 °C. Mass only moves through explicit transfers. With the battery and the heat lost to the air counted, total energy is conserved to 0.000000 kJ over a minute of random play in every level without a mirror (measured).
- **Budgets: correct.** Every level's energy budget matches hand calculation. Each level's efficiency star is reachable, and the advertised "wrong approaches" fail.
- **P0, skips a concept:** the unfrozen creek in levels 1 and 6 can be jumped, which skips freezing. In level 6 the glass wall stops 1.5 m short of each side wall, so you can walk around the dome door and skip the conduction puzzle, still with 3 stars.
- **P1, misconception risks:**
  - Melting walls, basins and balloons show a shrinking or growing mass next to a 🔒 icon.
  - The lens never shows a wall melting.
  - A false "האדים התעבו" (steam condensed) toast appears while boiling.
  - The white dry-ice fog is never explained.
- **P2, polish:** the rest is wording, Workbook terminology, display rounding, and hand-tuned constants that are not labelled.

## Findings

Severity: **P0** = wrong science, or an exploit that skips learning · **P1** = misleading, or a misconception risk · **P2** = polish.

| # | Sev | Where | Problem | Concrete fix |
|---|---|---|---|---|
| 1 | **P0** | `src/game/levels.ts:63-91` (L1 creek, gap 4.2 m), `:476`, `:513` (L6 creek, same gap); `src/game/game.ts:16-17` (JUMP_V 8.4, RUN 5.2) | **The unfrozen creek can be jumped, so freezing is skipped.** The run-and-jump arc plus the 0.32 m player radius and the 0.42 m step-up clear the 4.2 m channel when you take off 0.05–0.25 m before the edge, a window of about 2–3 frames at 60 fps. The checkpoint at z −1.2 makes retries free. Probe: L1 takeoffs at z −2.25…−2.45 land on the far bank with no splash. Confirmed with real keys in the browser: L1 won with 2★, creek 100 % liquid, 0 splashes (`l1-creek-jump-midair.png`, `l1-won-without-freezing.png`). The L6 creek clears with takeoffs at −0.59…−0.76. | Widen both channels to **5.0 m** (`d: 5.0` for the channel statics, the far banks and the pool `area`). Scale the creek body to keep the 6 cm top layer: `mass: 900` (3 × 5.0 × 0.06 × 1000). Updating the L1/L6 freezing energy and the stars follows from that: L1 freeze ≈ 900 × 338 = 304 MJ. Alternatively make the channel a no-jump zone (a hazard volume up to y = +1.6 over the water). Add the sweep test in §Tests. |
| 2 | **P0** | `src/game/levels.ts:228-232` (`glassWall` hard-codes a 4.5 m half-width), used at `:484` for L6, whose deck is 12 m wide (`|x| ≤ 6`) | **L6: walk around the glass wall.** There are 1.5 m open strips at x ∈ ±[4.5, 6]. Walk along x = ±5.3 past z −15 and you are inside the dome with the latch still frozen and the dome door shut. You skip the copper-vs-wood conduction choice and still finish with **3★** (61 MJ left). Confirmed in the browser with real WASD (setup teleport onto the deck only) in `l6-walking-around-glass.png`. L3 is not affected (its walls meet the glass at ±4.5). | Give `glassWall` a half-width argument, `glassWall(z, gateW, top = 3.6, half = 4.5)`, and use `glassWall(-15, 1.6, 3.6, 6)` in L6. Add the test "the dome is sealed while the latch is frozen" (§Tests). |
| 3 | P1 | `src/ui/hud.ts:388` (lens `🔒 מסה: …`), `src/ui/hud.ts:324` (gauge `· N ק״ג`) | **"Ice becomes less stuff when it melts."** Wall melt water moves at once into an invisible body (`runoff`), so the targeted body's mass falls: the L1 door reads `🔒 מסה: 590 ק״ג` mid-melt (block was 1063 kg; `l1-door-lens-midmelt.png`). The basin empties and the balloon grows the same way. The lock icon says "conserved", but the number changes in front of the student. | Show the conserved total wherever mass leaves a body. Wall: `קרח: 590 ק״ג · מים שזרמו: 473 ק״ג · סה״כ 1063 ק״ג 🔒` (use the body's initial mass from `def.bodies`). Basin/balloon/tank: one HUD line `💧 כל המים בשלב: 150 ק״ג 🔒` summed over the level's water bodies, excluding scenery water. At minimum, drop the 🔒 when the shown number can change. |
| 4 | P1 | `src/ui/hud.ts:361` | **The lens never shows a wall melting or sublimating.** It uses `st.changing`, which is `null` for walls because their liquid or gas drains every step. The gauge already uses `g.changeOf()` since `f2f046e`. Result: the L1 lens at 0 °C mid-melt shows only a vibrating lattice tagged `מוצק · קרח`. The handoff acceptance "the lens shows particles changing from vibrating to sliding" is not met at the door; it is met only when the creek freezes. | `const ch = g.changeOf(lensTarget.bodyId); const phases = ch ? [ch.from, ch.to] : [dom];` so the split solid/liquid (or solid/gas for dry ice) picture appears while a wall melts. |
| 5 | P1 | `src/game/game.ts:746-757` (backward completion), `src/main.ts:299-300` (toast) | **False "האדים התעבו בחזרה למים" toast while boiling.** Each step the basin's new steam drains into the balloon, so the basin "leaves the plateau" on the liquid side. The detector reads that as a backward gas→liquid completion. Measured: L2 fires it ~0.07 s after the first steam (t = 2.95 s, during heating); L6 fires it the moment the balloon tops out. The tank also gets a `start liquid>gas` event (boiling whoosh) when 100 °C condensate lands in it. The student is told condensation happened while they are boiling. | Emit a backward completion only if energy was actually leaving: `if (now.dom !== c && this.lastDir.get(id) !== 'down') continue;`. Also skip `start` events for bodies that only received mass this step (or that are the `from` of a drain of the phase being formed). Add the test in §Tests. |
| 6 | P1 | `src/render/levelView.ts:247-289` (white puffs from dry ice), `src/main.ts:303`, `src/game/levels.ts:386` (L4 takeaway) | **The white dry-ice fog is never explained, so "the white fog is CO₂ gas."** The fog from dry ice is condensed water droplets from the air; CO₂ itself is invisible. Steam already gets this treatment (L2 takeaway, "הגז השקוף") but dry ice does not. | Toast: `המראה! הקרח היבש הפך ישר לגז שקוף — בלי שלולית`. Append to the L4 takeaway: `הערפל הלבן הוא טיפות מים מהאוויר שהתקררו ליד הקרח היבש — הפחמן הדו־חמצני עצמו שקוף.` |
| 7 | P2 | `src/sim/thermal.ts:304`, `src/game/game.ts:647`, `src/main.ts:325` | **The cold glove silently does nothing on anything at or below air temperature** (the anti-farming floor added in `f2f046e`; e.g. the L6 glacier at −12 °C = air). Meanwhile the battery-empty toast says "pull heat from something". No feedback here risks "cold things contain no heat". It is also a game rule, not physics (a fridge cools below room temperature). It is documented in CURRICULUM.md but not shown to players. | When the cold glove targets a body with `T ≤ airT + 0.1`, toast once: `${label} כבר קר כמו האוויר — הכפפה שואבת רק חום מדברים חמים מהאוויר`. Change the battery-empty toast to `הסוללה ריקה — שאבו חום (❄️) ממשהו חם יותר מהאוויר`. |
| 8 | P2 | `src/game/game.ts:631` (only `style === 'glass'` statics and gates block the glove) | **Glass is the only material that blocks the glove; rock and ice do not.** The L1 creek can be targeted through the ice door, and the L4 water pipe through the dry-ice wall (measured candidate lists). L3's lesson is "sunlight passes through glass", so students may conclude glass is a special heat barrier while stone isn't, although both conduct poorly (glass ≈ 1, basalt ≈ 2 W/m·°C). No concept is skipped today. | Block the glove on any collider between hand and anchor (line of sight). Reword `main.ts:320` to `הכפפה צריכה קו ישיר — זכוכית, קירות ודלתות חוסמים אותה`. |
| 9 | P2 | `src/game/levels.ts:395`, `:440`; `CURRICULUM.md:3` | **Terminology:** "קיבול חום סגולי" is not a Workbook term. Grade 9 uses **חום סגולי** (53 occurrences, 0 of "קיבול חום"), and CURRICULUM.md claims to follow Workbook. | conceptHe: `חום כמוס וחום סגולי (כיתה ט׳)`. Takeaway: `…ולמים חום סגולי גבוה…`. Fix the CURRICULUM.md term list. |
| 10 | P2 | `src/ui/hud.ts:19` (ring word), `src/game/levels.ts:49` (L1 conceptHe) | **Terminology:** grade 7 names the transition **הקפאה (התמצקות)**; "קיפאון" appears only as "נקודת קיפאון" in grade 9. (התכה, רתיחה, עיבוי, המראה and ריבוץ all appear in Workbook; the Workbook pairs are היתוך (התכה) and התעבות (עיבוי), so they are fine.) | Ring: `'liquid>solid': 'הקפאה'`. L1: `conceptHe: 'התכה והקפאה'`. |
| 11 | P2 | `src/main.ts:291` | **Grammar:** `${labelHe} נמס` renders `דלת קרח נמס` (דלת is feminine) — visible in `l1-creek-jump-midair.png`. | `הקרח נמס — אותה מסה, עכשיו מים שזורמים הלאה` (no gendered label), or carry a gender per entity (`נמסה` for דלת). |
| 12 | P2 | `src/main.ts:125` | "המיסו, הקפיאו, הרתיחו **ועבו**" — unvoweled "עבו" reads as "thick" (עָבוּ), not "condense". | `המיסו, הקפיאו, הרתיחו והחזירו אדים למים — וחצו את אי המצפה הקפוא.` |
| 13 | P2 | `src/main.ts:342` | "המים לא נדחסים" is absolute; Workbook says "נוזל כמעט ואינו נדחס", and the L4 takeaway already says "כמעט". | `המים כמעט לא נדחסים — הדחיפה עברה עד השער!` |
| 14 | P2 | `src/game/levels.ts:106` (L1 takeaway) | "והסוללה התמלאה": the battery is charged, not full (≈ 287 of 900 MJ). | `…המים מסרו חום, והסוללה נטענה.` |
| 15 | P2 | `src/game/levels.ts:221` (L2 takeaway) | "רק המרחק בין החלקיקים" is narrower than Workbook ("רק הסידור והמרחקים בין החלקיקים משתנים"). | `…המסה לא משתנה — רק הסידור והמרחקים בין החלקיקים.` |
| 16 | P2 | `src/game/levels.ts:386` (L4 takeaway); `src/game/game.ts` `plungerResult` | "מוצק נועל את הצינור" can read as "solids don't transmit force". The real reason is that ice can't flow along the pipe. Also, a pipe that is ≥ 50 % liquid already gives a full "push" (measured: 55 % melted → push). Acceptable as slush, but unstated. | `מוצק לא נדחס וגם לא זורם — הקרח תקוע בצינור ונועל אותו.` Optionally require ≥ 90 % liquid for "push". |
| 17 | P2 | `src/game/levels.ts:440` (L5 takeaway) | "אותו חום מחמם ברזל פי 9 יותר" — say what is 9×: the temperature rise (4.18 / 0.45 = 9.3). | `…ולכן אותו חום מעלה את הטמפרטורה של ברזל בערך פי 9 יותר מאשר של אותה מסת מים.` |
| 18 | P2 | `src/ui/hud.ts:31-33` (`fmtT`) | −78.5 °C is displayed as **"−79 °C"**, because one decimal is shown only when \|T\| < 10. The sublimation plateau is a taught number. | Show one decimal whenever `T % 1 !== 0 && Math.abs(T) < 100` (or whenever the body is on a plateau). |
| 19 | P2 | `src/game/levels.ts:149` (balloon → tank drain), no `ambient` on `tank` or `balloon` | Condensate enters the L2 tank at 100 °C and **stays at 100 °C forever** in −6 °C air: it steams in the render and triggers a boiling start event. The steam balloon likewise never loses heat to the air. Neither simplification is documented. | Link `tank` to `plate` (`links: [{ a: 'tank', b: 'plate', G: 50 }]`) or give it an ambient loss, so the water cools toward the condenser. Add "the steam balloon is insulated (no heat loss)" to CURRICULUM.md's qualifications. |
| 20 | P2 | `src/game/game.ts:155-161` (rods), `src/game/levels.ts:146`, `:263`, `:264-268`, `:351`; `src/game/types.ts:142` | **"One shared CONDUCTION_SCALE" holds only for rods, and even there it is a copy.** The rods hard-code `* 30000` and duplicate k/density instead of calling `conductance()` and `MATERIALS`. The plate–balloon G = 900 and dark–latch G = 60 are tuned contact/condensation values, not `conductance(k, A, L)` (basalt by formula would be ≈ 21). Ambient G values are commented "not scaled" but are ~10³–10⁴× a real convective loss. Honest in effect, but not labelled. | `const G = conductance(MATERIALS[mat].k, area, segL)` and read density from `MATERIALS`. Re-comment `AmbientDef.G` as "game-tuned". Add one line to CURRICULUM.md listing the tuned link/ambient values. Add the test in §Tests. |
| 21 | P2 | player-facing UI (none); `CURRICULUM.md` "Units and scale" | **The deliberate simplifications are honest but labelled only in developer docs.** No screen states the glove rate (handoff: "at a stated rate") or that conduction is sped up. | Title card, after the glove line: `כל כפפה מעבירה עד 100 MJ בשנייה.` L3 win card, appended: `במשחק ההולכה מואצת מאוד: במציאות חום עובר לאורך מוט נחושת של 3 מ׳ בערך יממה, ולאורך מוט עץ — שנים.` (Diffusion time L²/α: copper ≈ 8.7×10⁴ s ≈ 1 day; wood ≈ 7×10⁷ s ≈ 2 years.) |
| 22 | P2 | `docs/handoff/BUILD_HANDOFF.md` misconception list vs levels | **Coverage gap:** "metal feels colder because it is colder" is listed for the game to catch, but no level, toast or lens moment addresses it. | E.g. in L3: an iron plate and a wooden plank at air temperature, where the lens shows the same −8 °C and a toast says `שניהם באותה טמפרטורה — המתכת רק מוליכה חום מהיד מהר יותר`. Or drop it from the handoff's promise. |
| 23 | P2 | `src/ui/hud.ts:24` | The gas icon ♨️ draws a visible steam cloud next to "גז · אדי מים". | Use a neutral glyph (e.g. `·:·` or a small dotted-circle SVG) for gas. |
| 24 | P2 | L6 design (`CURRICULUM.md` row 6: "pick the low-c lift") | Not forced, though physically honest: from the deck, cooling the balloon's 120 kg of steam returns 271 MJ (measured), which pays for the 1000 kg water lift (1000 × 4.18 × 64 ≈ 267 MJ). | Fine as energy recovery. Either accept and reword CURRICULUM.md ("the low-c lift is the cheap choice"), or put the balloon out of glove range from the deck. |
| 25 | P2 | `src/ui/lens.ts:53-63` | Optional nuance: the solid lattice is drawn denser than the liquid for every material, but for water ice is the less dense phase (917 vs 1000 kg/m³). Workbook's "למתקדמים" box teaches this. | For `mat === 'water'`, widen the lattice step (e.g. 100 px) so ice looks slightly more open than water. |
| 26 | P2 | L4 air pipe (`airpipe`, `maxT: 120`) | Heating the closed air pipe does nothing. Workbook notes that heating a closed gas raises its pressure (dangerous). Silent no-op. | Either cap `maxT` near air temperature (the glove then visibly does nothing), or show a toast: `הלחץ בצינור עלה — אבל אוויר עדיין נדחס, והשער כמעט לא זז`. |

## Tests: what they prove, and what is missing

`npx vitest run` → **2 files, 43 tests, all pass** on `cbe7ea6` (≈ 0.6–1.2 s).

**`tests/thermal.test.ts` is sound and proves what it claims:**

- The heating curve costs exactly m·c·ΔT + m·L per stage.
- Plateaus at 0 °C (≥ 333 of 400 one-kJ steps at exactly 0 °C) and 100 °C.
- Dry ice never has liquid.
- Mass is constant through phase changes.
- Freezing returns exactly the heat that melting cost.
- The iron/water ΔT ratio equals 4.18/0.45.
- Mass transfer conserves mass and energy.
- Conduction goes hot → cold, never overshoots, and copper ≫ wood.
- Battery limits and conservation hold.
- Caveats:
  - The conduction test uses an ad-hoc `G = k·0.01`, not `conductance()`, so it does not test the shared scale.
  - Nothing tests the `stateOf` boundary (enthalpy exactly at the end of a sensible segment). That boundary is the root of findings 4 and 5.

**`tests/levels.test.ts` proves each level is solvable through real inputs, and that the advertised wrong approaches fail** (wood rod, white latch, cold vent, big ice, water lift, heat-the-glacier, plug on the starting battery).

- It does **not** prove that the intended concept is *necessary*: both P0 bypasses pass the whole suite.
- "The water lift cannot get there on the battery" tests only a single fill. The claim holds in L5 because the big water tank is not targetable from the ground (I checked: the candidate ranking always prefers the nearer ice lift). That is fragile.
- "Conserves water mass over a minute of random play" is real, but random play rarely completes a phase change.

**Missing tests, in priority order:**

1. **Creek can't be jumped** (L1, L6): sweep takeoff z from the edge to 0.5 m before it, in 0.01 m steps, sprinting at full speed; expect a splash every time.
2. **Sealed regions:** in L6, walking from the deck to (±5.3, −17.5) with the latch frozen must not reach z < −15.3. Generalise this as a helper that tries to path around every gate.
3. **Global energy ledger:** Σ body H + battery + `airHeat` stays constant in every level (I measured 0.000000 kJ drift in L1, L2, L4, L5, L6). For L3, add a `sunHeat` accumulator in `updateWorldHeat` so the mirror input is counted.
4. **No backward phase events while only the heat glove is used:** no `phase` event with `done && from === 'gas'` during the L2/L6 boil (finding 5).
5. **Lens and gauge show conserved mass, and the lens shows two phases while a wall melts** (findings 3 and 4). Test `hud`'s input data via `g.changeOf()` and a total-mass helper.
6. **Uniform conduction scale:** for each rod, link G equals `conductance(MATERIALS[mat].k, πr², segL)`.
7. **Efficiency stars:** each level's star is reachable on the intended route. L6 needs the ice cooled to air temperature: 53.9 MJ left with deep freezing vs 20.3 MJ when stopping at 99 % solid (measured). Assert the bypasses don't get it.
8. **Thermal:** `stateOf` exactly at a segment boundary; `transferMass` of a phase out of a body sitting on a plateau.

## Verified correct

**Constants** (`src/sim/materials.ts`):

| Material | Checked values |
|---|---|
| Water | c = 2.1 / 4.18 / 2.0 kJ/kg·°C; L_f 334, L_v 2260 kJ/kg; ice 917 and water 1000 kg/m³; steam 0.6 kg/m³ at 100 °C |
| CO₂ | sublimation at −78.5 °C, 571 kJ/kg; solid 1560 kg/m³; gas c 0.84 |
| Copper | c 0.385, k 400 |
| Iron | c 0.45, k 80 |
| Wood | c 1.7, k 0.15 |
| Basalt | c 0.84, k 2 |

All are textbook values. Workbook rounds water's c to 4.2; 4.18 is consistent with it. The copper/wood conductivity ratio is 2667, matching the "~2,700×" in the comment.

**Model** (`src/sim/thermal.ts`):

- Enthalpy segments reproduce the 5-stage heating curve exactly as Workbook's grade-9 latent-heat lesson presents it.
- Temperature is pinned at the transition until the latent heat is supplied, and the phase split follows from enthalpy.
- Cooling releases exactly what heating cost.
- Conduction is explicit with sub-steps and an anti-overshoot limit, and conserves energy.
- The battery conserves energy between bodies and the gloves.
- Measured: zero ledger drift (body H + battery + air losses) over 60 s of random play in L1, L2, L4, L5, L6.

**Masses vs volumes:**

| Body | Size | Mass |
|---|---|---|
| L1 door | 2.2 × 3.1 × 0.17 m × 917 | 1063 kg |
| L1/L6 creek | top layer of 3 × 4.2 m | 756 kg = 6 cm, labelled "נחל (שכבת המים העליונה)" |
| L3 lock | 0.38³ × 917 | 50 kg |
| L3 latch | 0.4³ × 917 | 59 kg |
| L3 dark stone | 0.5³ × 3000 | 375 kg |
| L3 vent | 1.4 × 0.08 × 1.4 × 7870 | 1234 kg |
| L3 copper rod | 3.18 m long, r 0.06 m | 322 kg |
| L4 dry ice | 1.0 × 1.6 × 0.18 × 1560 | 449 kg |
| L6 glacier | 3 × 3.4 × 1.2 × 917 | 11 224 kg |
| L6 plug | 1.2 × 1.8 × 0.25 × 917 | 495 kg |

Basins draw ice at 917 and water at 1000 kg/m³, and the expansion on freezing is never turned into a mass change. The balloon size uses the real 0.6 kg/m³ (150 kg → r ≈ 3.9 m), visually capped at 3.2 m as documented.

**Energy budgets** (hand-computed; simulation agrees):

| Level | Hand calculation | Simulation |
|---|---|---|
| L1 | Door from −6 °C: 1063 × (2.1·6 + 334) = 368 MJ of the 400 MJ start. Creek 1 °C → ice: 756 × (4.18 + 334) = 256 MJ back. End ≈ 287 MJ ≥ 250 star. | Battery gain = creek enthalpy loss = 254.6 MJ |
| L2 | 150 kg ice from −8 °C → steam: 150 × (16.8 + 334 + 418 + 2260) = 454 MJ of 520. Condensing returns 339 MJ. End ≈ 405 MJ ≥ 350 star. | 404.7 MJ; tank refills to exactly 150.00 kg |
| L3 | Lock + copper rod ≈ 40 MJ. Sun 12 MW × 0.9 on the dark stone melts the latch in ≈ 6 s. White latch: 12 MW × 0.05 = 600 kW against an 80 kJ/s·°C loss → equilibrium ≈ −0.5 °C, never melts. Vent to 140 °C ≈ 82 MJ. | White latch −2.1 °C after 60 s; dark-stone route melts the latch in ≈ 6 s |
| L4 | Dry ice 449 × 571 = 256 MJ of 400. Ice pipe 200 kg from −12 °C: 72 MJ. End ≈ 72 MJ ≥ 40 star. Left alone, the dry ice sublimates from air heat. | Passable after ≈ 13 min — physically right, and the המראה toast still fires |
| L5 | Small ice 120 kg −10 → 26 °C: 55.6 MJ. Iron 1500 kg 20 → 75 °C: 37 MJ (< 45 MJ, as tested). Big ice needs 355 MJ just to finish melting (> 200 start / 300 cap). Water tank to its top: 317 MJ (> 300 cap). | The big-ice route cannot be brute-forced by refilling (tried) |
| L6 | Glacier ≈ 4 GJ vs a 150 MJ start, so "heat everything" fails. Plug 178 MJ > 150 MJ start. | Ledger 150 → 303 (fountain) → 133 (plug) → 396 (creek) → 80 (boil) → 39 (latch) → ≈ 20–54 MJ at the exit |

**Rules (`src/game/game.ts`) that teach the right thing:**

- Melt water drains while the wall's temperature stays at 0 °C.
- Steam rises into the balloon. The condenser routing returns the same mass (and drips back into the basin when the plate is hot).
- Radiation is absorbed in proportion to surface absorptivity (dark 0.9, white snow 0.05) and passes through glass.
- Ambient losses go toward air temperature, never past it.
- The updraft appears only when the vent is ≥ 40 °C above the air: warm air rising is convection.
- The plunger: gas squishes (pushes back), liquid transmits the push, solid locks.
- Lift height is a pure function of the tank's temperature, which makes the plateau and specific heat visible.

**Misconception handling that works:**

- Cold-glove sparks travel from the object into the glove (`main.ts:489-490`).
- The title card and the L1 hint frame the cold glove as "שואבת חום".
- The battery is "סוללת חום".
- The freezing toast says the heat left the water and entered the battery.
- Steam is described as transparent, with the white cloud as droplets (L2 toast and takeaway, render comment).
- Lens particle speed ∝ √T(K), and solid vibration never stops (amplitude 4 + 9·√(T/273) px, still ~12 px at −78.5 °C).
- L5 hints and takeaway separate heat from temperature.
- Hints and takeaways otherwise match Workbook content (plateau explanation, "שבירת כוחות המשיכה", hydraulics, sublimation without liquid, the three heat-transfer modes, dark absorbs / white reflects).
- Hebrew arrows `קרח ← מים ← אדים` follow Workbook's RTL style.

**Fixed during the review** (checked on `cbe7ea6`):

- Cold-glove energy farming below air temperature (`f2f046e`).
- The wall plateau ring now shows how much of the block is gone (`changeOf`).
- Repeated plunger toasts are deduplicated.

## Could not verify

- **Learning, fun and readability for 12–15-year-olds.** No playtest data exists; automation can't show these.
- **The full visual layer.** I checked two screenshots plus render code for steam, fog and condensate. I did not audit every particle effect for implied science (e.g. whether melt water visibly flows away in every level), the Tripo models, or audio cues.
- **Mobile/touch play,** including whether the narrow creek-jump window is easier or harder with the touch stick.
- **Exact human reachability of the creek jump.** It is proven reachable with real key presses at frame-exact timing; how often a student finds it by chance is unknown.
- **L3's energy ledger including the sun mirror** (there is no accumulator for mirror input). I confirmed only that the white latch never melts and the dark route works.
- **Workbook pages beyond the saved snapshots** (e.g. the live quiz items). Terminology checks used only `docs/curriculum/*.md`.
- **Whether `CURRICULUM.md`'s per-level claims hold in the rendered game for every claim** (e.g. "the wooden rod's near end smokes at 180 °C"). I verified the numbers in the model, not the visuals.

## Resolution (crew lead, 26 Oct 2026)

| # | Status | What changed |
|---|---|---|
| 1 | Fixed | Both creeks are 5.0 m wide (900 kg top layer). A run-jump sweep test from every take-off point, including past the edge, finds no landing; the same test fails on the old 4.2 m layout. |
| 2 | Fixed | `glassWall(z, gateW, top, half)`; level 6 uses half = 6. Test: the dome is sealed while the latch is frozen. |
| 3 | Fixed | The lens shows the conserved total: for walls `🔒 סה״כ 1063 ק״ג · קרח … + מים שזרמו …`, for drain-linked water `🔒 כל המים במערכת 150 ק״ג · כאן …`. The gauge shows the amount here without a lock. |
| 4 | Fixed | The lens uses `changeOf()`; a melting wall shows a split lattice/liquid picture whose divider follows the fractions. |
| 5 | Fixed | Energy direction is tracked from heating/cooling only (mass transfers subtracted). Bodies that only received mass this step emit no phase events. A backward finish needs energy to have really left. Test: boiling never announces condensation. |
| 6 | Fixed | Toast "…לגז שקוף…"; the L4 takeaway explains the white fog is water droplets and the CO₂ itself is transparent. |
| 7 | Fixed | One-time notice when the cold glove targets something at air temperature; the battery-empty toast says "חם יותר מהאוויר". |
| 8 | Fixed | The glove needs line of sight. Rock, other ice walls and closed gates block it (targets behind rock are not offered at all); glass and gates are still targetable to teach the rule. Toast: "הכפפה צריכה קו ישיר…". Test: no creek target through the ice door. |
| 9, 10 | Fixed | חום סגולי; הקפאה (ring and L1 concept); CURRICULUM.md term list. |
| 11–17 | Fixed | Wording as proposed (melting toast without gendered label, title line, "כמעט לא נדחסים", "נטענה", "הסידור והמרחקים", pipe-ice wording, "פי 9 בעליית הטמפרטורה"). Slush still pushes at ≥ 50 % liquid (unchanged; stated here). |
| 18 | Fixed | Temperatures show one decimal below 100 (−78.5 °C). |
| 19 | Fixed | The L2 tank loses heat slowly to the air; "the steam balloon is insulated" added to CURRICULUM.md. |
| 20 | Fixed | Rods use `conductance(MATERIALS[mat].k, …)` and material density (test). Tuned contact/loss values are listed in CURRICULUM.md (the plate link is now 3000 kJ/(s·°C) so condensing takes ~4 s). |
| 21 | Fixed | Title card: "כל כפפה מעבירה עד 100 MJ בשנייה". L3 takeaway states real conduction times (copper ~a day, wood ~years). |
| 22 | Fixed | L3 iron and wooden benches at the same −8 °C, with a toast explaining that metal only conducts heat from the hand faster. |
| 23 | Fixed | Gas chip icon is a neutral ◌. |
| 24 | Accepted | Recovering the balloon's steam energy to afford the water lift is honest; CURRICULUM.md now calls the iron lift "the cheap choice". |
| 25 | Fixed | The water-ice lattice is drawn more open than the liquid. |
| 26 | Fixed | The air pipe can't be heated (maxT = air temperature). |
