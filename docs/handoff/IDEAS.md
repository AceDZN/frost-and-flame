# Science 3D games, round 2 — ten ideas, three builds

25 October 2026, evening. After the first science round (Clean Flow, Short Circuit, pH Rangers), the user asked: "ideate and start builder crews for 3 other science games — same way as before, ideation cycle, then open a new thread for each game builder team. make sure to use the workbook science curriculum — you can choose whatever grade/topic you want." Same rules as round 1: fun-first real 3D web games, Hebrew UI, Israeli curriculum as published in Workbook, ChatGPT gameplay mockups → Tripo models (rigged characters) → build → compare, public AceDZN repo, regular commits to `main`.

## What the portfolio needs

Science games already built or building: Matter Customs, Clumpus, Storm Proof, Clean Flow, pH Rangers (chemistry); Short Circuit (electricity); Codex's matter-switchyard, separation-heist, circuit-critters (chemistry/electricity). **Chemistry and circuits are saturated; biology has nothing; grade 7 and grade 9 have almost nothing.** So round 2 aims at biology, matter/heat physics and energy, across grades 7–9.

Lesson from round 1: the user played Clean Flow v1 and found it "barely understood what to do… weird… boring… too hard because of the flow/controls"; the v2 rebuild as short, clear puzzles worked. So every round-2 brief demands **instant clarity**: the goal and the controls must be obvious in the first 10 seconds without reading, difficulty ramps gently, and real-time pressure is opt-in.

## Curriculum (saved snapshots: [`curriculum/`](curriculum/))

| Grade / chapter | Modules | What a game can act on |
|---|---|---|
| 9 / 8 — תורשה וגנטיקה | heredity-intro, dna-structure, chromosomes, mendel-basics, genotype-phenotype, probability-genetics, codominance-blood, genetic-variation, heredity-environment, mutations | Alleles in pairs (one from each parent); dominant (T) hides recessive (t); TT and Tt look the same (carriers!); Punnett square probabilities (Tt×Tt → 1:2:1, 3:1 phenotype); codominance (ABO blood: A and B both show, O recessive); sex determination 50%; environment also shapes phenotype; mutations change DNA. |
| 7 / 2 — מבנה החומר | particle-model, phase-transitions, heat-transfer, diffusion, compression, sublimation, surface-tension, viscosity | Particles always move; solid vibrates in place, liquid slides, gas flies free; melting/boiling need energy, freezing/condensing release it; mass is unchanged in a phase change; gas compresses, liquid doesn't; conduction, convection, radiation. |
| 9 / 12 — חום | heat-vs-temperature, specific-heat, latent-heat, heat-transfer | Heat ≠ temperature; Q = m·c·ΔT (water c is large, metals small); latent heat: temperature stays flat while melting/boiling (heating curve plateaus). |
| 7 / 4 and 9 / 10 — אנרגיה | kinetic-energy, potential-energy, thermal-energy, energy-transformations, conservation-law; energy-units, Ep = mgh, Ek = ½mv², energy-conversion, conservation-law, road-safety | Workbook uses g = 10 m/s²; mgh = ½mv² so fall speed doesn't depend on mass; with friction, Ep + Ek = Ep′ + Ek′ + heat; a pendulum can't rise above its release height; doubling speed quadruples Ek (and braking distance). |
| 8 / 5 — כוחות | friction | Friction turns motion energy into heat; rough vs smooth surfaces. |

## What the map showed

Pinned 73,466-game corpus, same blend code as before ([`measure-pairs.py`](measure-pairs.py), [`pair-evidence.csv`](pair-evidence.csv), [`pair-evidence.json`](pair-evidence.json)). Lower density = emptier.

| Blend | Related | Density ↓ | Idea |
|---|:-:|---:|---|
| Botany Manor × Opus Magnum | ✗ | 0.636 | (photosynthesis — fails relatedness) |
| **Session: Skate Sim × Kerbal Space Program** | ✓ | **0.644** | #3 Halfpipe Joule |
| The Talos Principle × Oxygen Not Included | ✗ | 0.653 | (phase puzzle alt. — fails) |
| **Bugsnax × Niche** | ✓ | **0.655** | #1 Gene Ranch |
| **Q.U.B.E. 2 × Oxygen Not Included** | ✓ | **0.668** | #2 Frost & Flame |
| Terra Nil × Plague Inc | ✓ | 0.688 | #7 Rewild |
| Osmos × Sokobond | ✓ | 0.699 | #4 Octet |
| Slime Rancher × Niche | ✓ | 0.705 | #1 alt. |
| Vampire Survivors × Plague Inc | ✓ | 0.705 | #6 Gut Run |
| Snake Pass × Sokobond | ✓ | 0.710 | #10 Carbon Snake |
| FTL × Plague Inc | ✓ | 0.718 | #5 Body Crew |
| BeamNG.drive × Kerbal | ✓ | 0.724 | #9 Brake Point |
| Raft × Kerbal | ✓ | 0.725 | #8 Ballast |
| Cooking Simulator × Opus Magnum | ✓ | 0.751 | (heat kitchen — crowded) |

Measured evidence only; G1 pending, no optimizer, no originality claim.

## The ten ideas

| # | Idea | Curriculum | Fun | Learn | 3D | Build | Gap | Fills a gap in the portfolio | Total |
|---|---|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| 1 | **Gene Ranch — חוות הגנים** | g9 genetics | 5 | 5 | 5 | 4 | 4 | 5 (first biology) | **28** |
| 2 | **Frost & Flame — כפור ולהבה** | g7 particle model + phases, g9 heat | 5 | 5 | 5 | 4 | 4 | 5 (first grade 7, first heat) | **28** |
| 3 | **Halfpipe Joule — ג'ול ברמפה** | g7 + g9 energy, g8 friction | 5 | 4 | 5 | 3 | 5 | 4 (first energy) | **26** |
| 4 | Octet — אוקטט | g8/g9 bonding | 4 | 5 | 4 | 4 | 3 | 2 (chemistry again) | 22 |
| 5 | Body Crew — צוות הגוף | g8 homeostasis | 5 | 4 | 3 | 3 | 2 | 4 | 21 |
| 6 | Gut Run — מסע במעי | g9 enzymes + digestion | 4 | 4 | 4 | 4 | 3 | 4 | 23 |
| 7 | Rewild — מחדשים | g7/g9 ecology | 4 | 4 | 4 | 3 | 3 | 4 | 22 |
| 8 | Ballast — נטל | g7 density, buoyancy | 4 | 4 | 4 | 3 | 2 | 4 | 21 |
| 9 | Brake Point — נקודת בלימה | g9 Ek, road safety | 4 | 4 | 4 | 3 | 2 | 3 | 20 |
| 10 | Carbon Snake — נחש הפחמן | g9 carbon, polymers | 4 | 4 | 4 | 4 | 2 | 2 | 20 |

### 1. Gene Ranch — חוות הגנים (build)
Bugsnax × Niche (Slime Rancher × Niche as alt.). First-person creature ranch on a floating Galilee island. Catch fluffy "Gnoomies" in the wild with a vacuum net, pair them in the breeding barn, and fill orders from the village (a long-eared blue one for the circus, a pure-breeding line of spotted ones for the farmer). Every trait is two alleles; dominant ones hide recessive ones, so two plain-looking parents can surprise you with a curly-tailed baby — they were carriers. A Punnett lens over any pair shows the odds; a test-cross with a recessive-looking partner reveals a hidden genotype; blood-type-style codominance makes stripes AND spots. Fun: Slime Rancher's catch-and-collect joy plus the gambling thrill of a hatching egg. Learning: you can't fill orders efficiently without reasoning about genotypes and probabilities.

### 2. Frost & Flame — כפור ולהבה (build)
Q.U.B.E. 2 × Oxygen Not Included. Third-person 3D puzzle-platformer. A small character with a heat glove (right hand) and a cold glove (left) crosses a frozen observatory island by changing the state of matter: melt an ice wall to water and let it flow away, freeze a stream into a bridge, boil a pool into steam that lifts a balloon, condense steam on a cold plate to refill a basin, warm a metal rod to melt ice at its far end (conduction), ride warm rising air (convection), aim a sun mirror (radiation). A particle lens shows the real particle picture of anything you look at. Grade-9 bonus in late levels: an ice block's thermometer sticks at 0 °C while it melts (latent heat), and metal heats faster than water (specific heat). Fun: satisfying elemental puzzle verbs with clear visual consequences.

### 3. Halfpipe Joule — ג'ול ברמפה (build)
Session: Skate Sim × Kerbal (emptiest passing blend this round). Third-person skate park on the Tel Aviv promenade; an energy ring around the skater shows Ep, Ek and heat in joules (g = 10). You can't reach a ledge higher than your drop without pumping (work); sand and rough asphalt drain energy into heat; a heavier skater reaches the same height from the same drop. Challenges are energy budgets disguised as skate lines. Distinct from Hypotenuse Rush (math, grappling traversal): a closed park about momentum, no grappling.

### 4–10 (not built this round)
- **Octet** (Osmos × Sokobond): atom arena, shells and bonding. Good, but chemistry is already the most-covered subject. Handoff exists in round 1.
- **Body Crew** (FTL × Plague Inc): body systems as an FTL crisis. Handoff exists in round 1; crowdier blend.
- **Gut Run** (Vampire Survivors × Plague Inc): an enzyme crew rides food through the digestive tract, each enzyme fitting its substrate (lock and key), denatured by the wrong pH or heat. Close to Percent Pulse's arena combat.
- **Rewild** (Terra Nil × Plague Inc): restore a quarry into an ecosystem — producers, consumers, decomposers, carrying capacity, the 10% rule.
- **Ballast** (Raft × Kerbal): a raft-salvage survival where density decides float; overlaps Storm Proof's material choice.
- **Brake Point** (BeamNG × Kerbal): stopping distance ∝ v²; strong safety lesson, but driving feel is hard in a browser.
- **Carbon Snake** (Snake Pass × Sokobond): a slithering carbon chain that bonds 4 ways, alkanes and polymers.

## Why these three

| | Gene Ranch | Frost & Flame | Halfpipe Joule |
|---|---|---|---|
| Core verbs | catch, pair, predict, hatch, deliver orders | traverse, melt/freeze/boil/condense, redirect heat | ride, pump, choose a line, land |
| Camera / input | first person, mouse/touch, cozy pace | third-person platformer, keyboard/gamepad/touch | third-person chase, momentum controls |
| Decision | which pair gives the trait I need, and how likely? | which change of state, and where does the energy come from? | do I have the energy to make this, and where am I losing it? |
| Subject / grade | biology, grade 9 | matter and heat, grades 7 + 9 | energy, grades 7 + 9 (+8 friction) |
| Look | pastel island ranch, fluffy creatures, warm sunset | icy observatory, glowing orange/blue gloves, crisp contrast | sunny promenade skate park, concrete and graffiti |

None repeats a round-1 loop (desk inspection, rolling blob, build-then-storm, pipe puzzles, stealth wiring, spray containment) or the five math games. Fun and learning are hypotheses until students play.

Handoffs: [`handoffs/science-claude-r2-2026-10-25/`](../../handoffs/science-claude-r2-2026-10-25/COMMON.md).
