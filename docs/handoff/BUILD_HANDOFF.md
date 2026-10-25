# Frost & Flame — כפור ולהבה — build handoff

Read `../COMMON.md` first (especially "Lesson from round 1"). Repo `/Users/acedzn/dev/AceDZN-exp/frost-and-flame` → public `AceDZN/frost-and-flame`, port 5202 (preview 4202).

## Promise

A third-person 3D puzzle-platformer about the states of matter. A small explorer with a **heat glove** (orange, right hand) and a **cold glove** (blue, left hand) crosses a frozen observatory island by changing what things are made of: melt an ice wall and watch the water pour away, freeze a stream into a bridge, boil a pool into steam that lifts a balloon, condense steam on a cold plate to refill a basin, heat one end of a metal rod to melt ice at the other end. The fun is powerful, elemental verbs with big, satisfying, visible results and clever "oh!" solutions. You learn the particle model and heat because every solution is a phase change or a heat path.

Map evidence: Q.U.B.E. 2 × Oxygen Not Included — related ✓, density 0.668. Not a certified gap. **Convergence watch:** Scale Shift (math) is a first-person surreal architecture puzzle — keep Frost & Flame third-person, character-driven, icy-warm and elemental.

## Curriculum

Grade 7, chapter 2: [particle-model](https://science.workbook.co.il/grade-7/chapter-2/particle-model), [phase-transitions](https://science.workbook.co.il/grade-7/chapter-2/phase-transitions), [heat-transfer](https://science.workbook.co.il/grade-7/chapter-2/heat-transfer), [compression](https://science.workbook.co.il/grade-7/chapter-2/compression), [diffusion](https://science.workbook.co.il/grade-7/chapter-2/diffusion), [sublimation](https://science.workbook.co.il/grade-7/chapter-2/sublimation), [viscosity](https://science.workbook.co.il/grade-7/chapter-2/viscosity), [surface-tension](https://science.workbook.co.il/grade-7/chapter-2/surface-tension).
Grade 9, chapter 12 (late levels): [heat-vs-temperature](https://science.workbook.co.il/grade-9/chapter-12/heat-vs-temperature), [specific-heat](https://science.workbook.co.il/grade-9/chapter-12/specific-heat), [latent-heat](https://science.workbook.co.il/grade-9/chapter-12/latent-heat), [heat-transfer](https://science.workbook.co.il/grade-9/chapter-12/heat-transfer).

Rules: particles always move; solid = vibrate in place, liquid = slide past each other, gas = fly freely and fill the space; melting, boiling/evaporation and sublimation need added energy, freezing, condensation and deposition release it; **mass doesn't change in a phase change** (a block of ice becomes the same mass of water — the level's water volume must match); gas compresses, liquids barely do (a gas piston springs back, a water piston pushes through — hydraulics); heat flows hot → cold by conduction (metals fast, wood/air slow), convection (warm fluid rises) and radiation (sunlight through empty space, absorbed by dark surfaces); grade 9: heat ≠ temperature, Q = m·c·ΔT (water warms slowly, metal fast), the temperature **stays at the melting/boiling point until the phase change finishes** (latent heat — the heating-curve plateau). Dry ice sublimates (CO₂ solid → gas) at room conditions.

Scientific qualifications: water expands slightly when freezing (fine to show ice floating; don't make it a mass change); "steam" visible clouds are condensed droplets, the gas itself is invisible — label carefully (אדים vs טיפות); keep temperatures in °C with water's 0 and 100 at normal pressure; the gloves add or remove energy at a stated rate (a heat budget), never "magic".

Misconceptions to catch: "ice becomes less stuff when it melts"; "particles stop moving in a solid"; "heat and temperature are the same"; "the temperature keeps rising while ice melts"; "cold flows into things"; "metal feels colder because it is colder".

## Core loop

1. **Look:** a level is a compact 3D diorama with a clearly glowing exit. A **particle lens** (hold a button) shows any material's particles moving as solid/liquid/gas, plus its temperature.
2. **Act:** aim a glove at an object and hold: energy flows in (heat) or out (cold), shown as a stream of orange or blue sparks and a temperature gauge on the object. When it reaches its transition, the state changes with a big satisfying effect (crack-melt, splash, whoosh of steam, crystal freeze).
3. **Physics follows:** water flows downhill and pools (simple height-field or grid fluid), ice is solid and walkable, steam rises and lifts light objects, metal conducts to its other end, warm air columns carry the explorer's paper glider.
4. **Solve:** reach the exit. Limited glove energy per level (refill crystals) makes efficient heat paths matter in later levels.

## Six levels (vertical slice)

1. **Thaw.** Melt the ice door, walk through. Freeze the creek to cross. One verb at a time.
2. **Steam Lift.** Boil a basin; the rising steam fills a balloon that lifts a platform; condense steam on a cold plate to refill a dry pool. Mass stays: the pool refills to the same level as the ice it came from.
3. **Heat Paths.** Out of reach behind glass: heat a copper rod (conducts fast) vs a wooden pole (doesn't); a sun mirror (radiation) melts a dark ice block, not a white one; a warm air column (convection) carries your glider.
4. **Squeeze.** A gas piston compresses and springs back; a water-filled piston doesn't compress and transmits the push to open a far door (hydraulics). Dry ice sublimates into a fog bridge-sensor puzzle.
5. **Plateau (grade 9).** A big ice block's gauge sticks at 0 °C while you pour heat — it's melting (latent heat); a puzzle needs you to notice the plateau and switch targets. A metal plate and a water tank heated equally: the plate gets hot first (specific heat), use it as a stove.
6. **Transfer: The Observatory.** No hints, no lens prompts: a new multi-room puzzle mixing all mechanics with a tight energy budget. Brute-forcing (heat everything) runs out of energy.

## Rules to keep authoritative (pure TS + tests)

- Each object: material (ice/water/steam, copper, wood, dry ice, air…), mass, temperature, phase; energy in/out updates temperature with c and holds at transition points until latent heat is supplied; phase follows from state. Conduction between touching objects by material conductivity. Tests: mass conserved through every transition, plateaus exist, each level solvable within its energy budget, the advertised wrong approaches fail.

## 3D, camera, art

- Third-person platformer camera with gentle auto-framing; responsive jump/run; the gloves glow on the character's hands.
- Visual thesis: a frozen island observatory at golden hour — blue-white ice, black basalt, brass instruments, warm orange interior light; elemental VFX are the stars (glove beams, melt drips, steam plumes, frost spread). Crisp, high contrast, not toy-industrial.
- Tripo candidates (≤ 6): the explorer (rigged, Mixamo: idle, run, jump, aim-left/aim-right, celebrate), the gloves (or bake into the character), the observatory dome set piece, the steam balloon platform, a brass piston/pipe set, a frozen creature or friendly companion (optional, rigged). Water, ice, steam, particles and gauges are procedural.

## Acceptance

First 30 seconds: walk up to a glowing ice door, hold heat, it melts in a splash, water flows away, walk through. The lens shows particles changing from vibrating to sliding. Level 5's plateau is learned through play. The transfer level is solvable without hints and fails a "heat everything" strategy.
