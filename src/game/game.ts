// Gameplay state and rules (no Three.js). The renderer reads this; tests drive it
// with the same Input the keyboard/touch controls produce.

import { HeatBattery, ThermalSystem, conductance, transferMass, type Body } from '../sim/thermal';
import { MATERIALS, type Phase } from '../sim/materials';
import { clamp, dist, distXZ, overlaps, segmentHitsAABB, toAABB, type AABB, type Box, type V3 } from './geom';
import type { EntityDef, HintStep, LevelDef, LiftDef, BalloonDef, PoolDef, RodDef, PlungerDef } from './types';

export const GLOVE_POWER = 100_000; // kJ/s (100 MJ/s) at full strength
const GLOVE_RAMP = 0.9; // seconds from 35% to full power
const RANGE = 6.5;
const LOCK_RANGE = 11;
const PLAYER_R = 0.32;
const PLAYER_H = 1.45;
const GRAVITY = -24;
const JUMP_V = 8.4;
const RUN = 5.2;

export interface Input {
  /** World-space move direction, length ≤ 1. */
  mx: number;
  mz: number;
  jump: boolean;
  heat: boolean;
  cold: boolean;
  lens: boolean;
}

export const NO_INPUT: Input = { mx: 0, mz: 0, jump: false, heat: false, cold: false, lens: false };

export type GameEvent =
  | { type: 'phase'; id: string; from: Phase; to: Phase; done: boolean }
  | { type: 'splash'; at: V3 }
  | { type: 'respawn' }
  | { type: 'glass'; at: V3 }
  | { type: 'battery'; state: 'empty' | 'full' }
  | { type: 'gate'; id: string }
  | { type: 'win' }
  | { type: 'jump' }
  | { type: 'land' }
  | { type: 'plunger'; id: string; result: 'squish' | 'push' | 'locked' }
  | { type: 'hint'; index: number }
  | { type: 'coldFloor'; id: string }
  | { type: 'bench'; id: string }
  | { type: 'noTarget' }
  | { type: 'aim'; target: string; absorb: number }
  | { type: 'batteryLow' };

export interface Collider {
  box: AABB;
  id: string;
}

interface PlayerState {
  pos: V3;
  vel: V3;
  yaw: number;
  onGround: boolean;
  groundId: string | null;
  gliding: boolean;
  respawn: V3;
  splashT: number; // >0 while splashing
}

export interface LearnEvent {
  t: number;
  level: string;
  action: string;
  target?: string;
  value?: number;
  hinted: boolean;
  retry: number;
}

export class Game {
  readonly def: LevelDef;
  sys = new ThermalSystem();
  battery: HeatBattery;
  t = 0;
  paused = false;
  won = false;
  player: PlayerState;
  input: Input = { ...NO_INPUT };
  colliders: Collider[] = [];
  target: string | null = null;
  glove: 'heat' | 'cold' | null = null;
  gloveHold = 0;
  /** Actual energy flow from the glove this frame (kJ/s, + into the target). */
  gloveFlow = 0;
  gloveBlocked: V3 | null = null;
  events: GameEvent[] = [];
  learn: LearnEvent[] = [];
  splashes = 0;
  hintsShown = new Set<number>();
  hintIndex = 0;
  hintStepT = 0;
  retry: number;
  // runtime per entity
  heights = new Map<string, number>(); // moving platform top y
  gateOpen = new Map<string, number>();
  latched = new Set<string>();
  plungerDepth = new Map<string, number>();
  mirrorAim = new Map<string, number>(); // index into aims, -1 none
  buttonsDown = new Set<string>();
  private lastPhase = new Map<string, { dom: Phase; changing: string | null }>();
  private heldPrev = { heat: false, cold: false, jump: false };
  private gateEvent = new Set<string>();
  private emptyWarned = false;
  private lowWarned = false;
  private fullWarned = false;
  private plungerLast = new Map<string, string>();
  private plungerReported = new Map<string, string>();

  constructor(def: LevelDef, retry = 0) {
    this.def = def;
    this.retry = retry;
    this.battery = new HeatBattery(def.battery.start, def.battery.capacity);
    for (const b of def.bodies) this.sys.add(b);
    for (const e of def.entities) if (e.kind === 'rod') this.buildRod(e);
    for (const l of def.links ?? []) this.sys.link(l.a, l.b, l.G);
    for (const e of def.entities) {
      if (e.kind === 'mirror') this.mirrorAim.set(e.id, -1);
      if (e.kind === 'gate') this.gateOpen.set(e.id, 0);
    }
    this.player = {
      pos: { ...def.spawn },
      vel: { x: 0, y: 0, z: 0 },
      yaw: def.cameraYaw ?? 0,
      onGround: false,
      groundId: null,
      gliding: false,
      respawn: { ...def.spawn },
      splashT: 0,
    };
    for (const [id, b] of this.sys.bodies) this.lastPhase.set(id, phaseKey(b));
    this.updateKinematics(0);
    this.rebuildColliders();
  }

  // ---------------------------------------------------------------- helpers

  entity<T extends EntityDef['kind']>(id: string): Extract<EntityDef, { kind: T }> {
    const e = this.def.entities.find((x) => x.id === id);
    if (!e) throw new Error(`no entity ${id}`);
    return e as Extract<EntityDef, { kind: T }>;
  }

  body(id: string): Body {
    return this.sys.get(id);
  }

  rodBodies(rod: RodDef): string[] {
    return Array.from({ length: rod.segments }, (_, i) => `${rod.id}#${i}`);
  }

  private buildRod(rod: RodDef) {
    const len = dist(rod.from, rod.to);
    const segL = len / rod.segments;
    const area = Math.PI * rod.radius * rod.radius;
    const mat = rod.mat;
    const density = MATERIALS[mat].density.solid!;
    const ids = this.rodBodies(rod);
    ids.forEach((id) =>
      this.sys.add({ id, mat, mass: density * area * segL, T: rod.T, maxT: mat === 'wood' ? 180 : 320, minT: -30 }),
    );
    const G = conductance(MATERIALS[mat].k, area, segL);
    for (let i = 0; i < ids.length - 1; i++) this.sys.link(ids[i], ids[i + 1], G);
    if (rod.touches) this.sys.link(ids[ids.length - 1], rod.touches, G);
  }

  /** Which body a glove acts on for a targetable entity. */
  bodyOf(e: EntityDef): string | null {
    switch (e.kind) {
      case 'ice':
      case 'pool':
      case 'plate':
      case 'lift':
      case 'plunger':
      case 'balloon':
        return e.body;
      case 'rod':
        return `${e.id}#0`;
      default:
        return null;
    }
  }

  /** World anchor for targeting, gauges and the lens. */
  anchor(e: EntityDef): V3 {
    switch (e.kind) {
      case 'ice': {
        const f = this.solidLeft(e.body);
        return { x: e.box.x, y: e.box.y + (e.box.h * Math.max(0.15, f)) / 2, z: e.box.z };
      }
      case 'pool':
        return { x: e.area.x, y: this.poolSurface(e), z: e.area.z };
      case 'plate':
        return { x: e.box.x, y: e.box.y + e.box.h, z: e.box.z };
      case 'rod':
        return { ...e.from };
      case 'lift':
        return { x: e.x, y: e.baseY + 0.6, z: e.z };
      case 'plunger':
        return { ...e.bulb };
      case 'balloon':
        return { x: e.x, y: (this.heights.get(e.id) ?? e.baseY) + 1.2, z: e.z };
      case 'mirror':
        return { ...e.pos };
      case 'button':
      case 'gate':
        return { x: e.box.x, y: e.box.y + e.box.h / 2, z: e.box.z };
    }
  }

  /**
   * The phase change shown for a body. Walls of ice shed their melt water at once, so
   * their own enthalpy keeps landing back on the start of the plateau: for them the
   * progress is how much of the original block is gone, while it sits at its melting point.
   */
  changeOf(bodyId: string): { from: Phase; to: Phase; progress: number } | null {
    const b = this.body(bodyId);
    const st = b.state;
    const wall = this.def.entities.find((e) => e.kind === 'ice' && e.body === bodyId);
    if (wall && wall.kind === 'ice') {
      const tr = b.material.transitions[0];
      const left = this.solidLeft(bodyId);
      if (tr && Math.abs(st.T - tr.at) < 1e-6 && left < 0.999 && left > 0) return { from: 'solid', to: tr.to, progress: 1 - left };
    }
    return st.changing;
  }

  /** Total water in the bodies linked to this one by drains (sinks excluded): what the lens shows as conserved. */
  systemMass(bodyId: string): number {
    const seen = new Set([bodyId]);
    const todo = [bodyId];
    while (todo.length) {
      const id = todo.pop()!;
      for (const d of this.def.drains ?? []) {
        for (const [a, b] of [
          [d.from, d.to],
          [d.to, d.from],
        ]) {
          if (a === id && !seen.has(b) && b !== 'runoff' && b !== 'co2air') {
            seen.add(b);
            todo.push(b);
          }
        }
      }
    }
    let m = 0;
    for (const id of seen) m += this.body(id).mass;
    return m;
  }

  /** Fraction of the original solid still there (for walls that melt). */
  solidLeft(bodyId: string): number {
    const b = this.body(bodyId);
    const init = this.def.bodies.find((x) => x.id === bodyId)!;
    return clamp(b.massOf('solid') / init.mass, 0, 1);
  }

  poolSurface(p: PoolDef): number {
    if (p.levelMode === 'fixed') return p.surfaceY ?? p.floorY;
    const b = this.body(p.body);
    const vol = b.massOf('liquid') / 1000 + b.massOf('solid') / 917;
    return p.floorY + vol / (p.area.w * p.area.d);
  }

  // ---------------------------------------------------------------- step

  step(dt: number, input: Input = this.input) {
    this.input = input;
    if (this.paused || this.won) return;
    this.t += dt;
    this.received.clear();
    this.movedH.clear();
    for (const [id, b] of this.sys.bodies) this.prevH.set(id, b.H);
    this.updateKinematics(dt);
    this.rebuildColliders();
    this.updatePlayer(dt);
    this.updateGloves(dt);
    this.updateWorldHeat(dt);
    this.detectPhaseEvents();
    this.updateHints(dt);
    this.checkExit();
    this.heldPrev = { heat: input.heat, cold: input.cold, jump: input.jump };
  }

  private updateKinematics(dt: number) {
    for (const e of this.def.entities) {
      if (e.kind === 'balloon') this.heights.set(e.id, this.balloonTop(e));
      if (e.kind === 'lift') this.heights.set(e.id, this.liftTop(e));
      if (e.kind === 'button') {
        const pressed = this.player.groundId === e.id;
        if (pressed && !this.buttonsDown.has(e.id)) {
          this.buttonsDown.add(e.id);
          for (const m of this.def.entities) {
            if (m.kind !== 'mirror') continue;
            const i = m.aims.findIndex((a) => a.button === e.id);
            if (i >= 0) {
              this.mirrorAim.set(m.id, i);
              this.logLearn('aim-mirror', m.aims[i].target);
              const te = this.def.entities.find((x) => x.id === m.aims[i].target);
              const ab = te && 'absorb' in te && te.absorb !== undefined ? te.absorb : 0.5;
              this.events.push({ type: 'aim', target: m.aims[i].target, absorb: ab });
            }
          }
        } else if (!pressed) this.buttonsDown.delete(e.id);
      }
      if (e.kind === 'plunger') this.updatePlunger(e, dt);
      if (e.kind === 'gate') {
        const prev = this.gateOpen.get(e.id) ?? 0;
        let want = this.latched.has(e.id) ? 1 : clamp(e.open(this), 0, 1);
        if (e.latch && want >= 0.95) this.latched.add(e.id);
        const v = prev + clamp(want - prev, -dt * 1.5, dt * 1.8);
        this.gateOpen.set(e.id, dt === 0 ? want : v);
        if (v > 0.9 && !this.gateEvent.has(e.id)) {
          this.gateEvent.add(e.id);
          this.events.push({ type: 'gate', id: e.id });
          this.logLearn('gate-open', e.id);
        }
      }
    }
  }

  balloonTop(e: BalloonDef): number {
    const gas = this.body(e.body).massOf('gas');
    return e.baseY + e.rise * clamp(gas / e.fullKg, 0, 1);
  }

  liftTop(e: LiftDef): number {
    const T = this.body(e.body).T;
    return e.baseY + 0.35 + e.height * clamp((T - e.Tmin) / (e.Tmax - e.Tmin), 0, 1);
  }

  /** What the pipe contents do when pushed: gas squishes, liquid pushes through, solid locks. */
  plungerResult(e: PlungerDef): 'squish' | 'push' | 'locked' {
    const f = this.body(e.body).state.frac;
    if (f.solid > 0.5) return 'locked';
    if (f.gas > 0.1) return 'squish';
    return 'push';
  }

  private updatePlunger(e: PlungerDef, dt: number) {
    const pressed = this.player.groundId === e.id;
    const res = this.plungerResult(e);
    const target = !pressed ? 0 : res === 'squish' ? 0.42 : res === 'push' ? 0.16 : 0;
    const d = this.plungerDepth.get(e.id) ?? 0;
    this.plungerDepth.set(e.id, d + clamp(target - d, -dt * 2.5, dt * 2.5));
    const key = pressed ? res : 'up';
    if (key !== this.plungerLast.get(e.id)) {
      this.plungerLast.set(e.id, key);
      // report a press once per result (stepping on and off again is not news)
      if (pressed && this.plungerReported.get(e.id) !== res) {
        this.plungerReported.set(e.id, res);
        this.events.push({ type: 'plunger', id: e.id, result: res });
        this.logLearn(`plunger-${res}`, e.id);
      }
    }
  }

  /** How far the far piston is pushed (0..1) — read by gates. */
  plungerPush(id: string): number {
    const e = this.entity<'plunger'>(id);
    const pressed = this.player.groundId === e.id;
    if (!pressed) return 0;
    const res = this.plungerResult(e);
    const f = this.body(e.body).state.frac;
    if (res === 'push') return 1;
    if (res === 'squish') return 0.12 * (1 - f.gas);
    return 0;
  }

  rebuildColliders() {
    const out: Collider[] = [];
    for (const [i, s] of this.def.statics.entries()) if (!s.ghost) out.push({ box: toAABB(s), id: `static${i}` });
    for (const e of this.def.entities) {
      switch (e.kind) {
        case 'ice': {
          const f = this.solidLeft(e.body);
          if (f > 0.12) out.push({ box: toAABB({ ...e.box, h: e.box.h * f }), id: e.id });
          break;
        }
        case 'pool': {
          const f = this.body(e.body).state.frac.solid;
          const top = this.poolSurface(e);
          if (f > 0.02 && e.levelMode === 'fixed') {
            // ice grows in from both banks (along z)
            const reach = (e.area.d / 2) * Math.min(1, f / 0.97);
            const z0 = e.area.z - e.area.d / 2;
            const z1 = e.area.z + e.area.d / 2;
            const base = { x: e.area.x, y: top - 0.25, w: e.area.w, h: 0.25 };
            if (f >= 0.97) out.push({ box: toAABB({ ...base, z: e.area.z, d: e.area.d }), id: e.id });
            else {
              out.push({ box: toAABB({ ...base, z: z0 + reach / 2, d: reach }), id: e.id });
              out.push({ box: toAABB({ ...base, z: z1 - reach / 2, d: reach }), id: e.id });
            }
          }
          break;
        }
        case 'balloon': {
          const y = this.heights.get(e.id)!;
          out.push({ box: toAABB({ x: e.x, y: y - 0.3, z: e.z, w: e.platform.w, h: 0.3, d: e.platform.d }), id: e.id });
          break;
        }
        case 'lift': {
          const y = this.heights.get(e.id)!;
          const r = e.platform;
          out.push({ box: toAABB({ x: e.x, y: y - 0.25, z: e.z, w: r * 2, h: 0.25, d: r * 2 }), id: e.id });
          break;
        }
        case 'plate':
          out.push({ box: toAABB(e.box), id: e.id });
          break;
        case 'button':
          out.push({ box: toAABB(e.box), id: e.id });
          break;
        case 'plunger': {
          const d = this.plungerDepth.get(e.id) ?? 0;
          out.push({ box: toAABB({ ...e.box, h: e.box.h - d }), id: e.id });
          break;
        }
        case 'gate': {
          const o = this.gateOpen.get(e.id) ?? 0;
          if (o < 0.85) out.push({ box: toAABB({ ...e.box, y: e.box.y + e.box.h * o }), id: e.id });
          break;
        }
        case 'rod':
        case 'mirror':
          break;
      }
    }
    this.colliders = out;
  }

  private playerBox(p: V3 = this.player.pos): AABB {
    return { minX: p.x - PLAYER_R, maxX: p.x + PLAYER_R, minY: p.y, maxY: p.y + PLAYER_H, minZ: p.z - PLAYER_R, maxZ: p.z + PLAYER_R };
  }

  private updatePlayer(dt: number) {
    const p = this.player;
    if (p.splashT > 0) {
      p.splashT -= dt;
      if (p.splashT <= 0) {
        p.pos = { ...p.respawn };
        p.vel = { x: 0, y: 0, z: 0 };
        this.events.push({ type: 'respawn' });
      }
      return;
    }
    // ride moving platforms
    if (p.groundId && this.heights.has(p.groundId)) {
      const prevTop = this.prevHeights.get(p.groundId);
      const top = this.heights.get(p.groundId)!;
      if (prevTop !== undefined) p.pos.y += top - prevTop;
    }
    this.prevHeights = new Map(this.heights);

    const inp = this.input;
    const len = Math.hypot(inp.mx, inp.mz);
    const mx = len > 1 ? inp.mx / len : inp.mx;
    const mz = len > 1 ? inp.mz / len : inp.mz;
    const aiming = this.glove !== null;
    const speed = RUN * (aiming ? 0.55 : 1);
    const accel = p.onGround ? 40 : 14;
    p.vel.x += clamp(mx * speed - p.vel.x, -accel * dt, accel * dt);
    p.vel.z += clamp(mz * speed - p.vel.z, -accel * dt, accel * dt);
    if (len > 0.1 && !aiming) p.yaw = Math.atan2(mx, -mz);

    if (inp.jump && !this.heldPrev.jump && p.onGround) {
      p.vel.y = JUMP_V;
      p.onGround = false;
      this.events.push({ type: 'jump' });
    }
    p.vel.y += GRAVITY * dt;
    // paper glider: hold jump in rising warm air (convection) to ride it up
    const lift = this.updraftAt(p.pos);
    p.gliding = !p.onGround && inp.jump && lift > 0;
    if (p.gliding) p.vel.y = Math.min(p.vel.y + (12 + 26) * dt, 1 + lift);
    else if (!p.onGround && inp.jump && this.recentLift > 0 && p.vel.y < 0) p.vel.y = Math.max(p.vel.y, -2.2);
    this.recentLift = lift > 0 ? 0.8 : Math.max(0, this.recentLift - dt);
    p.vel.y = Math.max(p.vel.y, -30);

    const wasGround = p.onGround;
    p.onGround = false;
    p.groundId = null;
    this.moveAxis('x', p.vel.x * dt);
    this.moveAxis('z', p.vel.z * dt);
    this.moveAxis('y', p.vel.y * dt);
    if (p.onGround && !wasGround) this.events.push({ type: 'land' });

    // hazards: unfrozen water, falling off
    for (const e of this.def.entities) {
      if (e.kind !== 'pool' || !e.hazard) continue;
      const a = e.area;
      const inside = Math.abs(p.pos.x - a.x) < a.w / 2 && Math.abs(p.pos.z - a.z) < a.d / 2;
      if (inside && p.pos.y < this.poolSurface(e) - 0.05 && !p.onGround) {
        this.splash({ x: p.pos.x, y: this.poolSurface(e), z: p.pos.z });
        return;
      }
    }
    if (p.pos.y < -8) this.splash(null);

    for (const c of this.def.checkpoints ?? []) {
      if (p.onGround && distXZ(c, p.pos) < 1.6 && Math.abs(c.y - p.pos.y) < 1.2) p.respawn = { ...c };
    }
  }

  private prevHeights = new Map<string, number>();
  /** Seconds the glider keeps gliding after leaving the warm air column. */
  private recentLift = 0;

  private splash(at: V3 | null) {
    const p = this.player;
    p.splashT = 1.1;
    this.splashes++;
    this.events.push(at ? { type: 'splash', at } : { type: 'respawn' });
    this.logLearn(at ? 'splash' : 'fall');
  }

  private moveAxis(ax: 'x' | 'y' | 'z', amount: number) {
    const p = this.player;
    if (amount === 0) return;
    p.pos[ax] += amount;
    const box = this.playerBox();
    for (const c of this.colliders) {
      if (!overlaps(box, c.box)) continue;
      if (ax === 'y') {
        if (amount < 0) {
          p.pos.y = c.box.maxY;
          p.vel.y = 0;
          p.onGround = true;
          p.groundId = c.id;
        } else {
          p.pos.y = c.box.minY - PLAYER_H;
          p.vel.y = Math.min(0, p.vel.y);
        }
      } else {
        // step up small ledges
        const step = c.box.maxY - p.pos.y;
        if (step > 0 && step <= 0.42 && this.free({ ...p.pos, y: c.box.maxY + 0.01 })) {
          p.pos.y = c.box.maxY + 0.001;
          continue;
        }
        const min = ax === 'x' ? c.box.minX : c.box.minZ;
        const max = ax === 'x' ? c.box.maxX : c.box.maxZ;
        p.pos[ax] = amount > 0 ? min - PLAYER_R - 1e-4 : max + PLAYER_R + 1e-4;
        p.vel[ax] = 0;
      }
      return this.moveAxisSettle(ax);
    }
  }

  // after one resolution, make sure we're not still inside another box on this axis
  private moveAxisSettle(ax: 'x' | 'y' | 'z') {
    const p = this.player;
    for (let k = 0; k < 3; k++) {
      const box = this.playerBox();
      const hit = this.colliders.find((c) => overlaps(box, c.box));
      if (!hit) return;
      if (ax === 'y') {
        if (p.vel.y <= 0) {
          p.pos.y = hit.box.maxY;
          p.onGround = true;
          p.groundId = hit.id;
        } else p.pos.y = hit.box.minY - PLAYER_H;
      } else {
        const c = ax === 'x' ? (hit.box.minX + hit.box.maxX) / 2 : (hit.box.minZ + hit.box.maxZ) / 2;
        const min = ax === 'x' ? hit.box.minX : hit.box.minZ;
        const max = ax === 'x' ? hit.box.maxX : hit.box.maxZ;
        p.pos[ax] = p.pos[ax] < c ? min - PLAYER_R - 1e-4 : max + PLAYER_R + 1e-4;
      }
    }
  }

  private free(pos: V3): boolean {
    const box = this.playerBox(pos);
    return !this.colliders.some((c) => overlaps(box, c.box));
  }

  /** Upward push (m/s²-ish strength, 0 = none) of warm rising air at a point. */
  updraftAt(pos: V3): number {
    let best = 0;
    for (const e of this.def.entities) {
      if (e.kind !== 'plate' || e.role !== 'vent' || !e.updraft) continue;
      const top = e.box.y + e.box.h;
      if (distXZ(pos, e.box) > e.updraft.r || pos.y < top - 0.5 || pos.y > top + e.updraft.height) continue;
      best = Math.max(best, this.updraftStrength(e.id));
    }
    return best;
  }

  /** 0..~4: how strongly warm air rises above a vent (convection). */
  updraftStrength(id: string): number {
    const e = this.entity<'plate'>(id);
    const dT = this.body(e.body).T - this.def.airT;
    return dT < 40 ? 0 : Math.min(4, (dT - 40) / 30);
  }

  // ---------------------------------------------------------------- gloves

  /**
   * What lies between the hand and an entity: 'glass' (a lesson: the glove can't pass it,
   * sunlight can), 'solid' (rock, closed gates, other ice walls) or nothing.
   */
  lineBlock(e: EntityDef): { kind: 'glass' | 'solid'; at: V3 } | null {
    const p = this.player;
    const hand = { x: p.pos.x, y: p.pos.y + 1.0, z: p.pos.z };
    const a = this.anchor(e);
    let best: { kind: 'glass' | 'solid'; t: number } | null = null;
    const test = (box: AABB, kind: 'glass' | 'solid') => {
      const t = segmentHitsAABB(hand, a, box);
      if (t !== null && (!best || t < best.t)) best = { kind, t };
    };
    for (const st of this.def.statics) {
      if (st.ghost) continue;
      if (st.style === 'glass') test(toAABB(st), 'glass');
      else if (st.style === 'basalt' || st.style === 'snow' || st.style === 'dark') test(toAABB(st), 'solid');
    }
    for (const c of this.colliders) {
      if (c.id === e.id) continue;
      const x = this.def.entities.find((q) => q.id === c.id);
      // a barred gate is see-through like glass: you can aim at what's behind it, but the glove is stopped
      if (x && x.kind === 'gate') test(c.box, 'glass');
      if (x && x.kind === 'ice') test(c.box, 'solid');
    }
    if (!best) return null;
    const b = best as { kind: 'glass' | 'solid'; t: number };
    return { kind: b.kind, at: { x: hand.x + (a.x - hand.x) * b.t, y: hand.y + (a.y - hand.y) * b.t, z: hand.z + (a.z - hand.z) * b.t } };
  }

  candidates(): { id: string; score: number }[] {
    const p = this.player;
    const hand = { x: p.pos.x, y: p.pos.y + 1.0, z: p.pos.z };
    const fx = Math.sin(p.yaw);
    const fz = -Math.cos(p.yaw);
    const out: { id: string; score: number }[] = [];
    for (const e of this.def.entities) {
      if (!e.targetable) continue;
      const b = this.bodyOf(e);
      if (!b || this.body(b).mass <= 1e-6) continue;
      if (e.kind === 'ice' && this.solidLeft(e.body) <= 0.02) continue;
      // the condenser is worked from the ledge, not from the balloon that would sink under you
      if (e.kind === 'plate' && e.role === 'condenser' && this.player.groundId && this.def.entities.some((x) => x.kind === 'balloon' && x.id === this.player.groundId)) continue;
      const a = this.anchor(e);
      const d = dist(hand, a);
      if (d > RANGE) continue;
      const h = Math.hypot(a.x - hand.x, a.z - hand.z) || 1;
      const dot = ((a.x - hand.x) * fx + (a.z - hand.z) * fz) / h;
      if (dot < -0.1 && d > 4.5) continue;
      if (e.kind === 'balloon' && this.body(e.body).massOf('gas') < 1) continue;
      // never offer something the glove can't reach through rock or a closed door
      const blk = this.lineBlock(e);
      if (blk?.kind === 'solid') continue;
      // standing on a lift you mean its tank; standing on a balloon you mean the basin
      const own = this.player.groundId !== e.id ? 1 : e.kind === 'lift' ? 0.3 : e.kind === 'balloon' ? 3 : 1;
      const glass = blk?.kind === 'glass' ? 2.2 : 1;
      const high = Math.abs(a.y - hand.y) > 2.2 && this.player.groundId !== e.id ? 1.6 : 1;
      // the object the on-screen hint points at wins ties, so "hold E" works on what it shows
      const hinted = this.visibleHint?.target === e.id ? 0.45 : 1;
      out.push({ id: e.id, score: d * (1.7 - dot) * own * glass * high * hinted });
    }
    return out.sort((a, b) => a.score - b.score);
  }

  /** The highlighted target while no glove is held: sticky, so a small step doesn't flip it. */
  private pickIdleTarget(): string | null {
    const c = this.candidates();
    if (!c.length) return null;
    const cur = c.find((x) => x.id === this.target);
    if (cur && c[0].id !== cur.id && c[0].score > cur.score * 0.85) {
      // stay on the current target only while it is still roughly in front of the explorer
      const e = this.def.entities.find((x) => x.id === cur.id)!;
      const a = this.anchor(e);
      const p = this.player;
      const h = Math.hypot(a.x - p.pos.x, a.z - p.pos.z) || 1;
      const dot = ((a.x - p.pos.x) * Math.sin(p.yaw) - (a.z - p.pos.z) * Math.cos(p.yaw)) / h;
      if (dot > 0.3 || h < 1.2) return cur.id;
    }
    return c[0].id;
  }

  private updateGloves(dt: number) {
    const inp = this.input;
    const mode: 'heat' | 'cold' | null = this.player.splashT > 0 ? null : inp.heat ? 'heat' : inp.cold ? 'cold' : null;
    const started = mode && (mode !== this.glove || (mode === 'heat' && !this.heldPrev.heat) || (mode === 'cold' && !this.heldPrev.cold));
    if (!mode) {
      this.glove = null;
      this.gloveHold = 0;
      this.gloveFlow = 0;
      this.gloveBlocked = null;
      this.target = this.pickIdleTarget();
      return;
    }
    // pick a target when the button goes down; if it is used up mid-hold, the glove idles until released
    if (started) {
      this.target = this.pickIdleTarget();
      if (!this.target) this.events.push({ type: 'noTarget' });
      this.gloveHold = 0;
      if (this.target) this.logLearn(mode, this.target);
    }
    this.glove = mode;
    this.gloveHold += dt;
    this.gloveFlow = 0;
    this.gloveBlocked = null;
    if (!this.target) return;
    const e = this.def.entities.find((x) => x.id === this.target)!;
    if ((e.kind === 'ice' && this.solidLeft(e.body) <= 0.02) || this.body(this.bodyOf(e)!).mass <= 1e-3) {
      this.target = null;
      return;
    }
    const p = this.player;
    const hand = { x: p.pos.x, y: p.pos.y + 1.0, z: p.pos.z };
    const a = this.anchor(e);
    if (dist(hand, a) > LOCK_RANGE) {
      this.target = null;
      return;
    }
    // face the target while aiming
    p.yaw = Math.atan2(a.x - hand.x, -(a.z - hand.z));
    const blk = this.lineBlock(e);
    if (blk) {
      this.gloveBlocked = blk.at;
      if (started) {
        this.events.push({ type: 'glass', at: blk.at });
        this.logLearn(blk.kind === 'glass' ? 'glass-blocked' : 'wall-blocked', e.id);
      }
      return;
    }
    const power = GLOVE_POWER * Math.min(1, 0.35 + (0.65 * this.gloveHold) / GLOVE_RAMP);
    const body = this.body(this.bodyOf(e)!);
    if (started && mode === 'cold' && body.T <= this.def.airT + 0.1) this.events.push({ type: 'coldFloor', id: e.id });
    if (started && e.kind === 'plate' && e.role === 'bench') this.events.push({ type: 'bench', id: e.id });
    // the cold glove pumps heat out of things only while they are warmer than the air around them
    const moved = this.battery.apply(body, mode, power, dt, this.def.airT);
    if (moved !== 0) this.lastDir.set(body.id, moved > 0 ? 'up' : 'down');
    this.gloveFlow = moved / dt;
    if (mode === 'heat' && this.battery.energy <= 1 && !this.emptyWarned) {
      this.emptyWarned = true;
      this.events.push({ type: 'battery', state: 'empty' });
      this.logLearn('battery-empty', e.id);
    }
    if (mode === 'cold' && this.battery.energy >= this.battery.capacity - 1 && !this.fullWarned) {
      this.fullWarned = true;
      this.events.push({ type: 'battery', state: 'full' });
    }
    if (mode === 'heat' && this.battery.energy < 0.25 * this.def.battery.start && !this.lowWarned && this.battery.energy > 1) {
      this.lowWarned = true;
      this.events.push({ type: 'batteryLow' });
    }
    if (this.battery.energy > 0.35 * this.def.battery.start) this.lowWarned = false;
    if (this.battery.energy > 2) this.emptyWarned = false;
    if (this.battery.energy < this.battery.capacity - 2) this.fullWarned = false;
  }

  // ---------------------------------------------------------------- world heat

  private updateWorldHeat(dt: number) {
    // radiation from sun mirrors onto the aimed surface
    for (const e of this.def.entities) {
      if (e.kind !== 'mirror') continue;
      const i = this.mirrorAim.get(e.id) ?? -1;
      if (i < 0) continue;
      const aim = e.aims[i];
      const te = this.def.entities.find((x) => x.id === aim.target);
      if (!te) continue;
      const bodyId = this.bodyOf(te);
      if (!bodyId) continue;
      const b = this.body(bodyId);
      const absorb = ('absorb' in te && te.absorb !== undefined ? te.absorb : b.material.absorb) as number;
      if (b.mass > 0) b.addHeat(e.power * absorb * dt);
    }
    // losses to the cold air
    for (const a of this.def.ambient ?? []) {
      const b = this.body(a.body);
      if (b.mass <= 0) continue;
      const dT = b.T - this.def.airT;
      let Q = a.G * dT * dt;
      if (Number.isFinite(b.heatCapacity)) Q = Math.sign(Q) * Math.min(Math.abs(Q), Math.abs(dT) * b.heatCapacity);
      b.addHeat(-Q);
      this.airHeat += Q;
    }
    // mass flows: melt water runs off, steam rises into balloons, condensate drips
    for (const d of this.def.drains ?? []) {
      const from = this.body(d.from);
      const to = this.body(this.drainTarget(d.from, d.to));
      const amt = d.rate === Infinity ? from.massOf(d.phase) : d.rate * dt;
      if (amt > 0) this.moved(from, to, d.phase, amt);
    }
    // a melting wall: any vapour rises away, and once the solid is gone the last water runs off
    for (const e of this.def.entities) {
      if (e.kind !== 'ice') continue;
      const b = this.body(e.body);
      if (b.mass <= 0) continue;
      const to = this.body(e.drainTo);
      if (b.massOf('gas') > 0 && to.mat === b.mat) this.moved(b, to, 'gas', Infinity);
      if (b.massOf('solid') < 1e-3 && to.mat === b.mat) this.moved(b, to, 'liquid', Infinity);
    }
    this.sys.conduct(dt);
  }

  /** Energy (kJ) lost to the surrounding air so far — kept for conservation checks. */
  airHeat = 0;
  /** Which way the gloves last moved each body's energy (for plateau labels). */
  lastDir = new Map<string, 'up' | 'down'>();

  /** A balloon cooled directly drips back into its basin; one cooled by its condenser fills the far pool. */
  drainTarget(from: string, to: string): string {
    const redirect = this.def.entities.find((e) => e.kind === 'balloon' && e.body === from) as BalloonDef | undefined;
    if (!redirect) return to;
    const cond = this.def.entities.find((e) => e.kind === 'plate' && e.role === 'condenser');
    if (cond && cond.kind === 'plate' && this.body(cond.body).T < 80) return to;
    const basin = this.def.drains?.find((d) => d.to === from && d.phase === 'gas');
    return basin ? basin.from : to;
  }

  /** Records mass (and its enthalpy) moved by drains this step, so phase events can ignore it. */
  private moved(from: Body, to: Body, phase: Phase, amt: number) {
    const h0 = from.H;
    const t0 = to.H;
    const m = transferMass(from, to, phase, amt);
    if (m > 0) {
      this.movedH.set(from.id, (this.movedH.get(from.id) ?? 0) + (from.H - h0));
      this.movedH.set(to.id, (this.movedH.get(to.id) ?? 0) + (to.H - t0));
      this.received.add(to.id);
    }
  }

  private prevH = new Map<string, number>();
  private movedH = new Map<string, number>();
  private received = new Set<string>();

  private detectPhaseEvents() {
    // which way did each body's energy move by heating/cooling (not by mass arriving or leaving)?
    for (const [id, b] of this.sys.bodies) {
      const d = b.H - (this.prevH.get(id) ?? b.H) - (this.movedH.get(id) ?? 0);
      if (Math.abs(d) > 1e-3) this.lastDir.set(id, d > 0 ? 'up' : 'down');
    }
    const walls = new Set(this.def.entities.filter((e) => e.kind === 'ice').map((e) => (e as { body: string }).body));
    for (const [id, b] of this.sys.bodies) {
      if (b.mass <= 1e-2 || id === 'runoff' || id === 'co2air') {
        this.lastPhase.delete(id);
        continue;
      }
      const now = phaseKey(b);
      const was = this.lastPhase.get(id);
      this.lastPhase.set(id, now);
      if (!was) continue;
      const down = this.lastDir.get(id) === 'down';
      // a body that only received mass this step (steam arriving, condensate landing) is not changing phase by itself
      if (this.received.has(id)) continue;
      if (now.changing && now.changing !== was.changing) {
        let [from, to] = now.changing.split('>') as [Phase, Phase];
        if (down) [from, to] = [to, from];
        const key = `${from}>${to}`;
        if (this.lastStart.get(id) !== key) {
          this.lastStart.set(id, key);
          this.events.push({ type: 'phase', id, from, to, done: false });
          this.logLearn(`start-${key}`, id, b.T);
        }
      }
      if (!now.changing && was.changing && !walls.has(id)) {
        const [a, c] = was.changing.split('>') as [Phase, Phase];
        // left the plateau: forward if we ended in the new phase, backward otherwise
        const [from, to] = now.dom === c ? [a, c] : [c, a];
        const key = `${from}>${to}`;
        // a backward finish only counts if energy was really leaving (not steam draining away)
        const genuine = now.dom === c || down;
        if (genuine && now.dom === to && this.lastDone.get(id) !== key) {
          this.lastDone.set(id, key);
          this.lastStart.delete(id);
          this.events.push({ type: 'phase', id, from, to, done: true });
          this.logLearn(`done-${key}`, id, b.T);
        }
      }
    }
    // walls of ice count as melted (or sublimated) once they no longer block the way
    for (const e of this.def.entities) {
      if (e.kind !== 'ice' || this.brokenWalls.has(e.id)) continue;
      if (this.solidLeft(e.body) < 0.12) {
        this.brokenWalls.add(e.id);
        const to: Phase = this.body(e.body).mat === 'dryIce' ? 'gas' : 'liquid';
        this.events.push({ type: 'phase', id: e.body, from: 'solid', to, done: true });
        this.logLearn(`done-solid>${to}`, e.id);
      }
    }
  }

  private lastStart = new Map<string, string>();
  private lastDone = new Map<string, string>();
  private brokenWalls = new Set<string>();

  // ---------------------------------------------------------------- hints / exit

  get hintStep(): HintStep | null {
    return this.hintIndex >= 0 ? this.def.hintSteps[this.hintIndex] : null;
  }

  /** The hint currently on screen (null when hidden). */
  get visibleHint(): HintStep | null {
    const s = this.hintStep;
    if (!s || this.def.hints === 'none') return null;
    if (this.def.hints === 'always') return s;
    return this.hintStepT > 9 ? s : null;
  }

  private updateHints(dt: number) {
    const i = this.def.hintSteps.findIndex((h) => !h.done(this) && !h.skip?.(this));
    if (i !== this.hintIndex) {
      this.hintIndex = i;
      this.hintStepT = 0;
    }
    this.hintStepT += dt;
    if (this.visibleHint && !this.hintsShown.has(this.hintIndex) && this.def.hints === 'delayed') {
      this.hintsShown.add(this.hintIndex);
      this.events.push({ type: 'hint', index: this.hintIndex });
      this.logLearn('hint-shown', this.visibleHint.target);
    }
  }

  private checkExit() {
    const p = this.player;
    const ex = this.def.exit;
    if (distXZ(p.pos, ex) < 1.1 && Math.abs(p.pos.y - ex.y) < 1.5 && p.splashT <= 0) {
      this.won = true;
      this.events.push({ type: 'win' });
      this.logLearn('win', undefined, this.battery.energy);
    }
  }

  stars(): number {
    if (!this.won) return 0;
    return 1 + (this.splashes === 0 ? 1 : 0) + (this.battery.energy >= this.def.efficientAt ? 1 : 0);
  }

  logLearn(action: string, target?: string, value?: number) {
    this.learn.push({
      t: Math.round(this.t * 100) / 100,
      level: this.def.id,
      action,
      target,
      value: value === undefined ? undefined : Math.round(value * 10) / 10,
      hinted: this.hintsShown.size > 0 || this.def.hints === 'always',
      retry: this.retry,
    });
  }

  /** Objects the renderer and tests describe. */
  describe() {
    return this.def.entities
      .filter((e) => this.bodyOf(e))
      .map((e) => {
        const b = this.body(this.bodyOf(e)!);
        const s = b.state;
        return {
          id: e.id,
          kind: e.kind,
          label: e.labelHe,
          material: b.mat,
          massKg: round(b.mass, 2),
          T: round(s.T, 1),
          phase: { solid: round(s.frac.solid, 3), liquid: round(s.frac.liquid, 3), gas: round(s.frac.gas, 3) },
          changing: s.changing ? `${s.changing.from}>${s.changing.to} ${Math.round(s.changing.progress * 100)}%` : null,
        };
      });
  }
}

function round(v: number, d: number) {
  const k = 10 ** d;
  return Math.round(v * k) / k;
}

function phaseKey(b: Body): { dom: Phase; changing: string | null } {
  const s = b.state;
  const dom = (Object.keys(s.frac) as Phase[]).reduce((a, k) => (s.frac[k] > s.frac[a] ? k : a), 'solid' as Phase);
  return { dom, changing: s.changing ? `${s.changing.from}>${s.changing.to}` : null };
}

export type { Box };
