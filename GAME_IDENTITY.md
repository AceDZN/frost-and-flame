# Frost & Flame — כפור ולהבה — game identity

## One line
A third-person 3D puzzle-platformer: a small explorer with a **heat glove (right hand, orange)** and a **cold glove (left hand, blue)** crosses a frozen observatory island by melting, freezing, boiling and condensing things and by routing heat. Every solution is a change of state or a heat path.

## The core action without the setting
Walk up to a thing, hold one of two buttons, watch its temperature climb or fall until it *changes what it is* — and the world physically changes with it (a wall becomes a puddle, a stream becomes a bridge, a pool becomes a balloon of gas, a thermometer becomes an elevator). Energy is conserved: the cold glove **pulls heat out** of things and stores it in the **heat battery (סוללת חום)** on your back; the heat glove **spends** it. Freezing a creek charges you; melting a door costs you.

## First 10 seconds (must be obvious without reading)
The explorer stands on an icy ledge. Four steps ahead: a tall **glowing ice door**, and through the ice you see the warm orange **exit beacon**. The door has a pulsing ring and a big glyph: hold **E / 🔥**. Hold → orange sparks stream from the right glove, a thermometer above the door climbs to **0 °C and sticks there** while the door cracks, drips and slumps into a gush of water that runs down into the creek. Walk through.

## Controls
| | Keyboard | Mouse | Touch |
|---|---|---|---|
| Move | WASD / arrows | — | left thumb-stick |
| Jump / glide (hold) | Space | — | ⤒ button |
| Heat glove 🔥 (right hand) | **E** (hold) | right button (hold) | 🔥 button |
| Cold glove ❄️ (left hand) | **Q** (hold) | left button (hold) | ❄️ button |
| Particle lens 🔍 | **F** (hold) / Tab toggle | — | 🔍 button |
| Pause / restart | Esc / R | HUD buttons | HUD buttons |

Targeting is automatic: the nearest interactable in front of the explorer is outlined with a glowing ring and gets a floating gauge. No aiming skill needed.

## Camera
Third-person chase camera behind and above the explorer (~35° down, ~7 m away), gentle auto-framing that leans toward the current target and the exit. Never first person (keeps it distinct from Scale Shift).

## Visual thesis
A frozen basalt island observatory at **golden hour**: blue-white translucent ice, black wet basalt, snow drifts, polished **brass** instruments (thermometers, pipes, pistons, a domed observatory), warm orange interior lamplight against a cold violet-blue sky. The elemental VFX are the stars: orange spark streams from the right glove, blue frost streams *flowing from the object into* the left glove (heat leaves the object — cold never "flows in"), crack-melt, splashes, steam plumes, frost spreading across water. Crisp and high contrast; not toy-industrial, not pastel.

The explorer: a small, round-hooded polar explorer (fur-trimmed teal parka, goggles on the forehead, a brass heat-battery backpack with a glowing gauge window), one chunky **orange** glove on the right hand and one **ice-blue** glove on the left.

## HUD (Hebrew, RTL)
- Top right: level plaque `שלב 1 · הפשרה` + a one-line objective with an icon (`הגיעו למגדלור ←`).
- Top left: round buttons — pause, sound, restart.
- Bottom centre: the **heat battery** bar `סוללת חום` with an MJ number (LTR) — fills when you freeze/condense, drains when you heat.
- Floating object gauge (world-anchored): brass thermometer with `°C` value, phase chip (`מוצק` / `נוזל` / `גז`), during a phase change a progress ring `נמס… 45%`.
- Particle lens: a brass-ringed magnifier bubble over the target showing its particles — vibrating in a lattice (solid), sliding past each other (liquid), flying and filling the space (gas) — speed follows temperature. Labels: mass in kg (stays the same through every change), temperature.
- Touch: thumb-stick bottom-left, big round action buttons bottom-right.

## Levels (vertical slice)
1. **הפשרה — Thaw.** Melt the ice door; freeze the creek into a bridge (and watch your battery refill).
2. **מעלית קיטור — Steam Lift.** Boil a basin; the invisible gas fills a brass balloon that lifts your platform; on top, a cold plate condenses it back into water that refills the dry pool to the **same mark** (same mass) and floats the gate open.
3. **שבילי חום — Heat Paths.** A glass wall your glove can't reach through: heat the copper rod (conducts) not the wooden one; aim the sun mirror at the dark ice (absorbs radiation) not the white; warm a vent plate so rising warm air (convection) lifts your glider.
4. **לחץ — Squeeze.** A plunger pipe filled with steam squishes and springs back (gas compresses); condense it to water and the push goes straight through and opens the far door (liquids barely compress); freeze it and it locks. A dry-ice plug vanishes straight into gas.
5. **מישור — Plateau (grade 9).** Brass thermometer-lifts whose platform height *is* the temperature: an ice lift sticks at 0 °C while it melts (latent heat); an iron lift shoots up while a water lift barely moves with the same heat (specific heat). Choose what to heat.
6. **המצפה — The Observatory (transfer).** No hints, no prompts, a tight battery. Mixed mechanics in a changed situation. Heating everything runs out.

## Sound
Soft wind, crunchy footsteps on snow, glove hum (pitch follows power), ice cracks, splash, steam whoosh, frost crackle, a warm chime at the exit. Generated with WebAudio after the first gesture; mute toggle.

## What it is not
Not a courier/delivery loop, not a quiz, not first person, not a pipe-routing board. No "wrong answer" popups: wrong choices produce visible, funny, recoverable results (you slip into the creek, the wooden rod just smokes, the white ice sparkles and ignores the sun).
