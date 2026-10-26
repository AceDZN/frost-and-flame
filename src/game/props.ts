// Where solid props stand. Shared by the game (colliders) and the renderer (meshes),
// so everything you can see in the way also stops you.

import { MATERIALS } from '../sim/materials';
import type { Box } from './geom';
import type { LevelDef, LiftDef, MirrorDef, PlungerDef, RodDef } from './types';

/** A lift's tank stands beside its platform (outer side), never under it. */
export function liftTank(e: LiftDef, mass: number): { x: number; z: number; side: number } {
  const rho = e.tank === 'iron' ? MATERIALS.iron.density.solid! : e.tank === 'ice' ? MATERIALS.water.density.solid! : MATERIALS.water.density.liquid!;
  const side = Math.cbrt(mass / rho);
  const sign = e.x < 0 ? -1 : 1;
  return { x: e.x + sign * (e.platform + side / 2 + 0.35), z: e.z + 0.1, side };
}

/** The glass thermometer tube of a lift stands on its inner side. */
export function liftTube(e: LiftDef): { x: number; z: number } {
  return { x: e.x - (e.x < 0 ? -1 : 1) * (e.platform + 0.25), z: e.z };
}

/** The lighthouse that marks the exit stands just behind the exit point. */
export function exitLighthouse(def: LevelDef) {
  return { x: def.exit.x, y: def.exit.y, z: def.exit.z - 0.6 };
}

/** Two brass lamp posts near the spawn. */
export function spawnPosts(def: LevelDef) {
  return [-1, 1].map((sx) => ({ x: def.spawn.x + sx * 2.6, y: def.spawn.y, z: def.spawn.z + 1.2 }));
}

/** The pump body beside a plunger. */
export function pumpBox(e: PlungerDef): Box {
  return { x: e.box.x + (e.box.x < 0 ? -1.1 : 1.1), y: 0, z: e.box.z - 0.4, w: 0.65, h: 0.75, d: 1.5 };
}

/** The sun mirror's stand. */
export function mirrorBox(e: MirrorDef): Box {
  return { x: e.pos.x, y: 0, z: e.pos.z, w: 0.9, h: 1.8, d: 0.9 };
}

/** Small boxes along the part of a rod a player could walk into. */
export function rodBoxes(e: RodDef, floorY: number): Box[] {
  const out: Box[] = [];
  for (let i = 0; i <= 8; i++) {
    const t = i / 8;
    const x = e.from.x + (e.to.x - e.from.x) * t;
    const y = e.from.y + (e.to.y - e.from.y) * t;
    const z = e.from.z + (e.to.z - e.from.z) * t;
    if (y - floorY > 2.2) continue;
    out.push({ x, y: y - 0.14, z, w: 0.28, h: 0.28, d: 0.28 });
  }
  return out;
}

/** All prop colliders of a level (tank sizes need each body's mass). */
export function propBoxes(def: LevelDef): Box[] {
  const out: Box[] = [];
  const mass = (id: string) => def.bodies.find((b) => b.id === id)?.mass ?? 0;
  for (const e of def.entities) {
    if (e.kind === 'lift') {
      const t = liftTank(e, mass(e.body));
      out.push({ x: t.x, y: e.baseY, z: t.z, w: t.side + 0.12, h: t.side + 0.06, d: t.side + 0.12 });
    }
    if (e.kind === 'lift') {
      const tb = liftTube(e);
      out.push({ x: tb.x, y: e.baseY, z: tb.z, w: 0.42, h: e.height + 0.9, d: 0.42 });
    }
    if (e.kind === 'plunger') {
      out.push(pumpBox(e));
      out.push({ x: e.bulb.x, y: 0, z: e.bulb.z, w: 0.62, h: e.bulb.y + 0.3, d: 0.62 });
    }
    if (e.kind === 'mirror') out.push(mirrorBox(e));
    if (e.kind === 'rod') out.push(...rodBoxes(e, e.from.y - 1.1));
  }
  const lh = exitLighthouse(def);
  out.push({ x: lh.x, y: lh.y, z: lh.z, w: 0.9, h: 2.3, d: 0.9 });
  for (const p of spawnPosts(def)) out.push({ x: p.x, y: p.y, z: p.z, w: 0.25, h: 2.4, d: 0.25 });
  return out;
}
