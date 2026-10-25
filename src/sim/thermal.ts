// Authoritative heat model (no Three.js). Each body stores its mass and its total
// enthalpy H (kJ) measured from "all solid at T_REF". Temperature and the split
// between phases follow from H: while a transition is under way the temperature
// stays at the transition point until the latent heat is supplied (the plateau).
// Mass only moves between bodies through explicit transfers, so it is conserved.

import { MATERIALS, type Material, type MaterialId, type Phase } from './materials';

export const T_REF = -100;
/**
 * Shared multiplier for conduction through materials, so heat paths finish in game
 * time. It applies equally to every material, so copper still conducts ~2,700× better
 * than wood.
 */
export const CONDUCTION_SCALE = 30000;

/** Game conductance kJ/(s·°C) of a bar of material with cross-section `area` m² and `length` m. */
export function conductance(k: number, area: number, length: number): number {
  return ((k * area) / length / 1000) * CONDUCTION_SCALE;
}

interface Segment {
  kind: 'sensible' | 'latent';
  /** Specific enthalpy at the start of the segment (kJ/kg). */
  h0: number;
  /** Width of the segment in kJ/kg (Infinity for the last sensible segment). */
  dh: number;
  T0: number;
  c?: number; // sensible
  phase: Phase; // sensible: the phase; latent: the phase being formed
  from?: Phase; // latent: the phase being used up
}

const segmentCache = new Map<MaterialId, Segment[]>();

function segments(mat: Material): Segment[] {
  const cached = segmentCache.get(mat.id);
  if (cached) return cached;
  const out: Segment[] = [];
  let h = 0;
  let T = T_REF;
  let phase: Phase = mat.basePhase ?? 'solid';
  for (const tr of mat.transitions) {
    const c = mat.c[phase]!;
    const dh = c * (tr.at - T);
    out.push({ kind: 'sensible', h0: h, dh, T0: T, c, phase });
    h += dh;
    T = tr.at;
    out.push({ kind: 'latent', h0: h, dh: tr.L, T0: T, phase: tr.to, from: tr.from });
    h += tr.L;
    phase = tr.to;
  }
  out.push({ kind: 'sensible', h0: h, dh: Infinity, T0: T, c: mat.c[phase]!, phase });
  segmentCache.set(mat.id, out);
  return out;
}

/** Specific enthalpy (kJ/kg) of a pure phase at temperature T. */
export function hOf(matId: MaterialId, T: number, phase: Phase): number {
  const segs = segments(MATERIALS[matId]);
  for (const s of segs) {
    if (s.kind === 'sensible' && s.phase === phase) {
      const end = s.T0 + s.dh / s.c!;
      if (T <= end + 1e-9 || s.dh === Infinity) return s.h0 + s.c! * (T - s.T0);
    }
  }
  // Phase not stable at T (e.g. liquid water below 0): extrapolate along its sensible segment.
  const s = segs.find((x) => x.kind === 'sensible' && x.phase === phase);
  if (!s) throw new Error(`${matId} has no ${phase} phase`);
  return s.h0 + s.c! * (T - s.T0);
}

export interface ThermoState {
  T: number;
  /** Fraction of the mass in each phase (sums to 1). */
  frac: Record<Phase, number>;
  /** The phase change under way, if the body sits on a plateau. */
  changing: { from: Phase; to: Phase; progress: number } | null;
}

export function stateOf(matId: MaterialId, h: number): ThermoState {
  const segs = segments(MATERIALS[matId]);
  const frac: Record<Phase, number> = { solid: 0, liquid: 0, gas: 0 };
  if (h <= 0) {
    frac[segs[0].phase] = 1;
    return { T: T_REF + h / segs[0].c!, frac, changing: null };
  }
  for (const s of segs) {
    if (h <= s.h0 + s.dh || s.dh === Infinity) {
      const x = h - s.h0;
      if (s.kind === 'sensible') {
        frac[s.phase] = 1;
        return { T: s.T0 + x / s.c!, frac, changing: null };
      }
      const p = x / s.dh;
      frac[s.phase] = p;
      frac[s.from!] = 1 - p;
      return { T: s.T0, frac, changing: { from: s.from!, to: s.phase, progress: p } };
    }
  }
  throw new Error('unreachable');
}

export interface BodyInit {
  id: string;
  mat: MaterialId;
  mass: number; // kg
  T: number; // °C
  phase?: Phase; // needed when T sits exactly on a transition point
  /** Temperatures the gloves can push this body to. */
  maxT?: number;
  minT?: number;
}

export class Body {
  readonly id: string;
  readonly mat: MaterialId;
  mass: number;
  H: number;
  maxT: number;
  minT: number;

  constructor(init: BodyInit) {
    this.id = init.id;
    this.mat = init.mat;
    this.mass = init.mass;
    this.maxT = init.maxT ?? 200;
    this.minT = init.minT ?? -30;
    this.H = 0;
    this.setTemperature(init.T, init.phase);
  }

  get material(): Material {
    return MATERIALS[this.mat];
  }

  setTemperature(T: number, phase?: Phase) {
    const p = phase ?? stablePhase(this.mat, T);
    this.H = this.mass * hOf(this.mat, T, p);
  }

  get h(): number {
    return this.mass > 1e-9 ? this.H / this.mass : 0;
  }

  get state(): ThermoState {
    return stateOf(this.mat, this.h);
  }

  get T(): number {
    return this.state.T;
  }

  massOf(phase: Phase): number {
    return this.mass * this.state.frac[phase];
  }

  /** Heat capacity right now (kJ/°C); Infinity on a plateau. */
  get heatCapacity(): number {
    const s = this.state;
    if (s.changing) return Infinity;
    const ph = (Object.keys(s.frac) as Phase[]).find((k) => s.frac[k] > 0.5)!;
    return this.mass * this.material.c[ph]!;
  }

  /** Energy (kJ) the body can still accept before reaching T (≥0), or give before falling to T. */
  energyTo(T: number): number {
    const target = this.mass * hOf(this.mat, T, stablePhase(this.mat, T, T > this.T ? 'high' : 'low'));
    return target - this.H;
  }

  addHeat(Q: number) {
    this.H += Q;
  }
}

/** The phase that is stable at T. On an exact transition point pick the low or high side. */
export function stablePhase(matId: MaterialId, T: number, side: 'low' | 'high' = 'low'): Phase {
  const mat = MATERIALS[matId];
  let phase: Phase = mat.basePhase ?? 'solid';
  for (const tr of mat.transitions) {
    if (T > tr.at || (T === tr.at && side === 'high')) phase = tr.to;
  }
  return phase;
}

/** Moves `dm` kg of one phase from a to b, carrying that phase's enthalpy. Returns kg moved. */
export function transferMass(a: Body, b: Body, phase: Phase, dm: number): number {
  if (a.mat !== b.mat) throw new Error('mass transfer between different materials');
  const avail = a.massOf(phase);
  const m = Math.max(0, Math.min(dm, avail));
  if (m <= 0) return 0;
  const h = hOf(a.mat, a.T, phase);
  a.mass -= m;
  a.H -= m * h;
  if (a.mass < 1e-4) {
    // the last crumbs go too, so no body is left with a meaningless sliver
    b.mass += a.mass;
    b.H += a.H;
    a.mass = 0;
    a.H = 0;
  }
  b.mass += m;
  b.H += m * h;
  return m;
}

export interface Link {
  a: string;
  b: string;
  /** Conductance in kJ/(s·°C) (game units, see conductance()). */
  G: number;
}

export class ThermalSystem {
  bodies = new Map<string, Body>();
  links: Link[] = [];

  add(init: BodyInit): Body {
    const b = new Body(init);
    this.bodies.set(b.id, b);
    return b;
  }

  get(id: string): Body {
    const b = this.bodies.get(id);
    if (!b) throw new Error(`no body ${id}`);
    return b;
  }

  link(a: string, b: string, G: number) {
    this.links.push({ a, b, G });
  }

  totalEnergy(): number {
    let e = 0;
    for (const b of this.bodies.values()) e += b.H;
    return e;
  }

  totalMass(mat: MaterialId): number {
    let m = 0;
    for (const b of this.bodies.values()) if (b.mat === mat) m += b.mass;
    return m;
  }

  /** Conduction along every link. Sub-steps keep explicit integration stable. */
  conduct(dt: number) {
    if (!this.links.length) return;
    let dtMax = dt;
    for (const l of this.links) {
      const G = l.G;
      const A = this.get(l.a);
      const B = this.get(l.b);
      if (A.mass <= 1e-6 || B.mass <= 1e-6) continue;
      const c = Math.min(A.heatCapacity, B.heatCapacity);
      if (Number.isFinite(c) && G > 0) dtMax = Math.min(dtMax, (0.3 * c) / G);
    }
    const n = Math.min(400, Math.max(1, Math.ceil(dt / dtMax)));
    const h = dt / n;
    for (let i = 0; i < n; i++) {
      for (const l of this.links) {
        const A = this.get(l.a);
        const B = this.get(l.b);
        if (A.mass <= 0 || B.mass <= 0) continue;
        const dT = A.T - B.T;
        let Q = l.G * dT * h;
        // Never overshoot equilibrium on one link.
        const ca = A.heatCapacity;
        const cb = B.heatCapacity;
        const cEff = !Number.isFinite(ca) ? cb : !Number.isFinite(cb) ? ca : (ca * cb) / (ca + cb);
        if (Number.isFinite(cEff)) {
          const lim = Math.abs(dT) * cEff;
          if (Math.abs(Q) > lim) Q = Math.sign(Q) * lim;
        }
        A.addHeat(-Q);
        B.addHeat(Q);
      }
    }
  }
}

/**
 * The explorer's gloves. Energy is conserved: the cold glove pulls heat out of a body
 * into the heat battery, the heat glove spends battery energy into a body.
 */
export class HeatBattery {
  constructor(
    public energy: number, // kJ
    public capacity: number, // kJ
  ) {}

  /** Applies a glove for dt seconds. Returns the energy that actually moved (kJ, + into body). */
  apply(body: Body, mode: 'heat' | 'cold', power: number, dt: number): number {
    if (body.mass <= 0) return 0;
    if (mode === 'heat') {
      const room = Math.max(0, body.energyTo(body.maxT));
      const Q = Math.min(power * dt, this.energy, room);
      if (Q <= 0) return 0;
      body.addHeat(Q);
      this.energy -= Q;
      return Q;
    }
    const avail = Math.max(0, -body.energyTo(body.minT));
    const Q = Math.min(power * dt, this.capacity - this.energy, avail);
    if (Q <= 0) return 0;
    body.addHeat(-Q);
    this.energy += Q;
    return -Q;
  }
}
