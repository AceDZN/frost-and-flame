# ASSETS — Frost & Flame / כפור ולהבה

Every 3D model here was generated in **Tripo Studio** (https://studio.tripo3d.ai/) through the user's own signed-in Chrome session, from existing account credits, on 25–26 Oct 2026. No API, no tokens, no purchases. Gameplay mockups and the 2D reference images that fed Tripo were made in ChatGPT; see `docs/visual-targets/PROMPTS.md`.

Generated meshes are **visuals only**: never colliders, never a science surface. Gauges, particles, temperatures, water levels and the thermo-lift platform height are procedural and driven by game state.

## Pipeline used for every model

1. ChatGPT (same chat as the mockups) made an isolated, on-style reference image on a light-grey background (`docs/visual-targets/ref-*.png`; prompts in PROMPTS.md).
2. Tripo Studio → Model → **HD Model**, image upload, AI model **H3.1 – Best Quality**. Geometry & Texture: Texture ON, Texture Quality **2K**, PBR ON, Topology **Triangle**, Polycount **20,000**, Ultra Mesh/AI Complete off. Privacy left at the account default ("Sharing Only"). Displayed cost: **30 credits** per generation.
3. Export dialog: Format **GLB**, Texture Resolution **1k** (the dialog default; keeps files small).
4. Downloaded through the browser to `~/Downloads`, backed up unchanged to `~/Downloads/frost-and-flame-originals/glb/*-tripo-raw.glb`, copied to `public/models/`. **No optimisation pass** was run: every file is already < 2 MB, under the 3 MB target. Textures are JPEG 1024², so `optimize --texture-compress webp` would shrink them further if wanted.

Common properties of all Tripo GLBs below (measured with `@gltf-transform/core` 4.x):
- glTF 2.0, generator `Tripo`, no extensions, one mesh, one primitive, one PBR material (`baseColorTexture`, `normalTexture`, `metallicRoughnessTexture`, all JPEG 1024×1024), attributes `POSITION`, `NORMAL`, `TEXCOORD_0`, u16 indices.
- **Y up**, metres-ish but **normalised**: the longest dimension is 1.0, the base sits on y = 0 and the model is centred on x/z. Scale everything in-engine.
- **Front faces +Z.** For the explorer this is measured from the skeleton (toes at +Z, left hand at +X). For the props it is inferred from geometry asymmetry against the reference image (plunger T-handle at −X = image left, sun-mirror crank at +X = image right, i.e. the reference camera looked from +Z), consistent with Tripo's convention. Spot-check in the scene.

## Credits

- Balance shown at first check, before any job of mine: **7,855**. Other crews (Gene Ranch, Halfpipe Joule) were generating on the same account at the same time, so the balance moved continuously and deltas cannot be attributed to this crew alone.
- This crew's jobs, by displayed price: 6 × model generation @ 30 = **180**, 1 × Humanoid/Mixamo auto-rig @ 20 = **20**, 1 × AI animation ("aim") @ 20 = **20** (the balance dropped 6,835 → 6,815 on that click), 5 × preset retargets (idle, run, jump, cast_a_spell, cheer) showed **no price**. Total by displayed price: **220 credits** (6 generations + 2 rig/animation jobs, the full budget).
- Final balance seen at ~01:10 on 26 Oct: **6,815** (includes other crews' spend over the same period).

## Files

| File | Bytes | Triangles | BBox min → max (x, y, z) | sha256 |
|---|---|---|---|---|
| `public/models/explorer.glb` | 2,457,928 | 18,800 | (−0.386, 0, −0.220) → (0.386, 1.000, 0.220) (bind pose) | `1872e4c866e8e0d65e86fd6f350c41da788423476de8e2b2c164fab1db56562e` |
| `public/models/observatory.glb` | 1,473,980 | 18,782 | (−0.499, 0, −0.500) → (0.499, 0.854, 0.500) | `a86de42abfcd8aba1bf5cd19e04bff262b2215533a2375656182581f61006e84` |
| `public/models/balloon.glb` | 1,370,472 | 18,986 | (−0.297, 0, −0.297) → (0.297, 1.000, 0.297) | `9c8712c48b4574cba0740f15b2b5c79551e901d9f0a9ac4ffa9257ffcc92f401` |
| `public/models/thermo-lift.glb` | 1,382,576 | 18,638 | (−0.204, 0, −0.202) → (0.204, 1.000, 0.202) | `063124bbcb008ef4533c3b37076ed0d545df1ab0bd7b47d42b060032139323c9` |
| `public/models/sun-mirror.glb` | 1,127,644 | 19,663 | (−0.496, 0, −0.311) → (0.496, 1.000, 0.311) | `b6733685e1479b0896c45d55869bf69a70aeb230c883003165474424c75b784c` |
| `public/models/plunger.glb` | 1,292,924 | 19,032 | (−0.500, 0, −0.207) → (0.500, 0.491, 0.207) | `4e2795aba4ee2e9e6061ecbf89ad828e95157a6093fb61936df661fd819a84b3` |

---

## 1. Explorer — `public/models/explorer.glb` (hero, rigged)

- **Source image:** `docs/visual-targets/ref-explorer.png` (A-pose front view; prompt in PROMPTS.md).
- **Generate task:** https://studio.tripo3d.ai/workspace/generate/0c3a88bb-4237-4200-9906-2c614401c128 — 30 credits. Tripo reported 18,802 faces / 12,111 vertices before rigging, 18,800 / 12,110 after.
- **Rig task:** https://studio.tripo3d.ai/workspace/rigging/0c3a88bb-4237-4200-9906-2c614401c128 — Rigging Type **Humanoid**, Skeleton Preset **Mixamo**, 20 credits.
- **Animate page:** https://studio.tripo3d.ai/workspace/animate/0c3a88bb-4237-4200-9906-2c614401c128 — Preset tab, no credit price shown for presets.
- **Export settings:** GLB, 1k textures, Export Skeleton ON, all retargeted animations selected, **"Animation stay in Place" ON**.
- **Skeleton:** scene root node `Armature` (identity transform) → skin with **65 joints**, root joint **`mixamorig:Hips`**, standard Mixamo names with the `mixamorig:` prefix (`mixamorig:Spine`, `Spine1`, `Spine2`, `Neck`, `Head`, `HeadTop_End`, `LeftShoulder/LeftArm/LeftForeArm/LeftHand`, full five-finger chains `LeftHandThumb1–4 … LeftHandPinky1–4`, same for Right, `LeftUpLeg/LeftLeg/LeftFoot/LeftToeBase/LeftToe_End`, same for Right). Three.js note: `GLTFLoader` sanitises node names, so the `:` disappears at runtime (`mixamorigHips`). Bind pose is the A-pose of the reference.
- **Proportions (bind pose, world units):** height 1.0 (HeadTop_End y = 0.872, hood/goggles reach 1.0), Hips y = 0.330, Head y = 0.686, hands at x = ±0.29, y = 0.43. Chibi: head+hood is about a third of the height.
- **Look on the mesh:** the **orange mitten is on the character's right hand (−X)** and the **ice-blue mitten on the left (+X)**: distinct, saturated colours, verified in the Tripo viewer. Teal parka, thick cream fur trim, brass goggles on the hood, brown boots. **The brass battery is on the chest** (harness straps over the shoulders), inherited from the reference image; seen from behind (checked in the Tripo viewer) the back carries a plain **olive-green canvas rucksack with brown leather straps**: no brass and no glowing window. The chase camera mostly sees the back, so if the battery gauge should be visible, add a small procedural glowing brass gauge on the rucksack (around the upper back, between the shoulder blades).

### Clips

All six clips sit in **one GLB on the same skeleton** (195 channels each = 65 joints × T/R/S), so use one `AnimationMixer` with `clipAction(name)`. All are **in place**: Hips translation never moves in x/z (Δx = Δz = 0), only up and down. Arm figures below come from forward kinematics on the exported file (hand position relative to the shoulder joint; the arm is ≈ 0.21 long; +fwd = +Z).

| Clip name | Source | Duration | Loop? | What it does (measured / seen) |
|---|---|---|---|---|
| `idle` | preset `idle` | 15.333 s | yes | gentle standing idle, Hips bob 0.006 |
| `run` | preset `run` | 1.250 s | yes | run cycle in place, Hips bob 0.022 |
| `jump` | preset `jump` | 2.208 s | yes | **five consecutive small hops**, ~0.45 s each, Hips rising 0.07–0.12 above rest (rest y ≈ 0.31). It's a bouncy hop loop, not one take-off/air/land jump. For a single jump, play one hop (e.g. 0.42 → 0.92 s) and drive the real vertical motion from physics, or freeze a mid-air frame (t ≈ 0.70 s, Hips at its highest) while airborne |
| `aim` | **AI animation** (prompt below), renamed from the auto-name | 4.958 s | hold the end | 0.0–1.0 s rest in A-pose; 1.0–2.0 s the **right (orange) arm** rises; **2.0–4.96 s the right arm is held straight forward**, hand ≈ 0.19 in front of and 0.05 above the shoulder, almost still; the left arm stays down. For the heat glove: play once and clamp (`LoopOnce` + `clampWhenFinished`), or loop the 2.0–4.96 s range. For the cold glove (left hand), mirror it in code or take the left-arm part of `cast_a_spell` |
| `cast_a_spell` | preset `cast_a_spell` | 5.375 s | optional | two-handed spell sequence: **left arm forward** 0–2.0 s (hand ≈ 0.17–0.21 forward), then **right arm forward** 2.5–4.0 s (≈ 0.22 forward), small crouch (Hips 0.28–0.34) |
| `cheer` | preset `cheer` | 12.083 s | yes | celebration: arms raised overhead, alternating one and both (hands up to 0.20 above the shoulders) |

AI animation prompt (Animate → "Create Your Own Animation", text, 5 s slider, 20 credits):
> Standing in place, the character raises the RIGHT arm straight forward at shoulder height, palm open and facing forward, and holds it steady as if spraying a stream of sparks from the right hand, body braced slightly forward, small breathing motion; the left arm stays relaxed at the side. Loopable, feet stay planted.

Processing: the downloaded GLB `explorer-6clips-tripo-raw.glb` (2,498,244 B, sha256 `a4c3023cb43e0434169a4cfc04fc3dbc50bc60d18a3fb12adcc7d898b27babd6`) was re-written with `@gltf-transform/core` 4.x **only to rename the AI clip** from its auto-name ("Standing in place, the character raises the RIGHT arm straight ") to `aim`. No other change. Final `public/models/explorer.glb`: **2,457,928 B**, sha256 **`1872e4c866e8e0d65e86fd6f350c41da788423476de8e2b2c164fab1db56562e`**. `gltf-transform validate`: 0 errors. Two benign warnings: no TANGENT attribute (three.js derives tangents) and "skinned mesh node is not root".

Earlier interim exports, superseded, kept only as backups: `explorer-idle-run-tripo-raw.glb`, `explorer-idle-run-jump-tripo-raw.glb`.

Not done: no separate `walk` clip (use `run` with a lower `timeScale`, or ask for the free `walk` preset later); no face rig.

---

## 2. Observatory dome — `public/models/observatory.glb`

- Source image `docs/visual-targets/ref-observatory.png`. Task: https://studio.tripo3d.ai/workspace/generate/f9d245fa-1fcc-4a90-b36c-2bd496652a2c — 30 credits. Static, no skin, no animation.
- Round building on a rough black-basalt rock base with snow on the ledges, a stone ground storey with an arched wooden door with a brass ring and warm orange-lit arched windows (baked into the texture, not emissive), a brass railing balcony, and a riveted copper/brass dome with an open slit and a big brass telescope barrel. The bbox is 1.0 × 0.854 × 1.0 (almost as deep as wide). Footprint radius ≈ 0.5: scale to the level (e.g. ×8 for an 8 m-wide building).
- The window glow is texture only. Add an emissive overlay or point lights in-engine for the "warm lamplight" look.

## 3. Steam balloon lift — `public/models/balloon.glb`

- Source image `ref-balloon.png`. Task: https://studio.tripo3d.ai/workspace/generate/91d86147-3f26-43e2-a7d9-74d9d25197e4 — 30 credits.
- One merged mesh: cream canvas envelope with riveted copper ribs and an equator band (top of bbox), brass collar, four chains, a round wooden platform with a brass rim and railing, and a brass intake funnel under it (bottom). Measured radial profile (normalised units): intake funnel y 0–0.10; **platform deck at y ≈ 0.10–0.15, radius ≈ 0.21**, railing up to y ≈ 0.30; chains y 0.30–0.45; envelope y ≈ 0.45–1.0, widest (radius ≈ 0.30) at y ≈ 0.65–0.70.
- Because it is one mesh, the **envelope can't be inflated separately** from the platform. For "swelling" either scale the whole model, or hide it and use a procedural envelope. To stand the explorer on the deck, use y ≈ 0.14 × model scale. The explorer is 1.0 tall at native scale versus a deck radius of 0.21, so scale the balloon about ×4–5 relative to the explorer.

## 4. Brass thermometer tower (thermo-lift) — `public/models/thermo-lift.glb`

- Source image `ref-thermo-lift.png`. Task: https://studio.tripo3d.ai/workspace/generate/01dcc4bb-77d8-44e4-b3fb-c1e620e21e1c — 30 credits.
- A basalt plinth, a riveted brass cage around a big red glass bulb, a tall glass column with a red liquid stripe and a brass scale strip, brass bands, and a round railed platform at the top. Slim: 0.41 × 1.0 × 0.40. Measured profile: plinth y 0–0.15 (radius 0.21), bulb cage y 0.15–0.30, **column y 0.30–0.85, radius ≈ 0.10**, **top platform y ≈ 0.85–1.0, radius ≈ 0.17**.
- The **platform and the red liquid are baked into the single mesh**: the platform can't ride the column by itself. For the temperature-driven lift, use this as the static column and add a separate procedural platform disc plus a procedural liquid column (emissive red cylinder) whose height comes from game state, or hide the top ~15% of the mesh (y > 0.85) with a clipping plane.

## 5. Brass sun mirror (heliostat) — `public/models/sun-mirror.glb`

- Source image `ref-sun-mirror.png`. Task: https://studio.tripo3d.ai/workspace/generate/bdafba6c-7b45-40a4-9d58-709a3fd70900 — 30 credits.
- A round mirror in a riveted brass ring, a U-yoke on a brass turntable, a basalt pedestal, and a crank handle on the +X side (y ≈ 0.36–0.42). The mirror face points +Z and tilts up (its top leans back toward −Z). The mirror surface is a **painted sky reflection** in the base-colour texture, not a real reflector: override that region's material (high metalness, low roughness, env map) or overlay a procedural disc if the beam needs to read.
- Single mesh, so the yoke/mirror can't pivot on its own. For aiming, overlay a separate procedural mirror disc that rotates, or rotate the whole model about Y.

## 6. Brass hydraulic plunger set — `public/models/plunger.glb`

- Source image `ref-plunger.png`. Task: https://studio.tripo3d.ai/workspace/generate/53dc9822-02d0-4b27-9acf-6c4316955da8 — 30 credits.
- Horizontal along X (1.0 long, 0.49 tall, 0.41 deep) on a basalt slab: at **−X** a tall brass cylinder with a T-handle (the highest point, y ≈ 0.49), a clear glass pipe in the middle with a pressure gauge on top, and at **+X** the second cylinder and a ram plate.
- Single mesh: the T-handle, piston and ram don't move. Animate procedural stand-ins (a brass cylinder for the piston, a box for the ram) over or instead of the baked parts. Show the pipe's contents (steam, water, ice) with procedural geometry inside the glass section (roughly the middle third of X).

## Processing by the crew lead (26 Oct 2026)

Textures re-encoded to WebP (quality 85) with `npx @gltf-transform/cli@4 webp in.glb out.glb`; geometry, skin and animation clips untouched (all six clips verified loading in Three.js afterwards). The table above lists the raw Tripo files; the shipped files are:

| File | Bytes (raw → shipped) | sha256 (shipped) |
|---|---|---|
| explorer.glb | 2,457,928 → 1,944,536 | `aae3ee7bfb40077df6e286ff9a6a8cb6c2ecb1d0cee049ef6acdb63d4eedba4d` |
| observatory.glb | 1,473,980 → 855,596 | `00a2ab1db7b819ab5166210428ec2aa1cc9c55ea280c85971a9f1ac83d4ffeff` |
| balloon.glb | 1,370,472 → 819,528 | `87f0c8064f2d295bbc99bd30b2fbaa51433dde4e0880dd097c75c0bb89cd1d68` |
| thermo-lift.glb | 1,382,576 → 842,404 | `71e8fc7d9fbd8182587bed281733c9736da36c4e51e5ba335eb9398b101b2505` |
| sun-mirror.glb | 1,127,644 → 705,700 | `9b7339c16ab7e908c58b56a76c0db6382ccaa80e6cb891a977c6d9e9d6a39864` |
| plunger.glb | 1,292,924 → 786,592 | `44b3f2b09e762f12b0025579e131191ee6e22ef5f5566a86a339bebca425e4c3` |

How each model is used in gameplay:
- **explorer** — the player character (AnimationMixer: idle, run, the first hop of the jump loop, aim while a glove is held, cheer on the win). A procedural brass battery backpack and glove glows are attached in code.
- **balloon** — split with two clipping planes: the basket is the steam-lift ride (fixed size), the envelope swells with the gas mass (radius from the real 100 °C steam volume, visually capped).
- **sun-mirror** — the level 3 heliostat, standing upright on its stone base; it turns about its stand toward the chosen target (solid: you can't walk through it).
- **plunger** — solid pump bodies beside the two level 4 plungers (the interactive plunger disc, pipes and glass bulb are procedural).
- **thermo-lift** — brass thermometer towers as landmarks just outside the walkable area beside the level 5/6 lifts (the live lift — tank beside the platform, glass tube, liquid column — is procedural and solid).
- **observatory** — landmark in every level; the goal building in level 6.
