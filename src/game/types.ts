import type { BodyInit } from '../sim/thermal';
import type { Phase } from '../sim/materials';
import type { Box, V3 } from './geom';
import type { Game } from './game';

export type Style = 'basalt' | 'snow' | 'ice' | 'glass' | 'brass' | 'wood' | 'stone' | 'dark';

export interface StaticBox extends Box {
  style: Style;
  /** Visual only: no collision. */
  ghost?: boolean;
}

interface EntityBase {
  id: string;
  labelHe: string;
  /** Can the gloves target it? */
  targetable?: boolean;
}

/** A block of ice / dry ice that is solid (a wall) until it melts or sublimates. */
export interface IceDef extends EntityBase {
  kind: 'ice';
  body: string;
  box: Box;
  /** Where its melt water / gas goes (a body id). */
  drainTo: string;
  /** Surface override for sunlight: dark grit absorbs, white snow reflects. */
  absorb?: number;
  tint?: 'clear' | 'white' | 'dark' | 'dry';
}

/** Water in a channel or basin. Freezes into a walkable crust; liquid is a splash hazard. */
export interface PoolDef extends EntityBase {
  kind: 'pool';
  body: string;
  area: { x: number; z: number; w: number; d: number };
  floorY: number;
  /** 'fixed': surface layer of a flowing creek; 'volume': level follows the mass inside. */
  levelMode: 'fixed' | 'volume';
  surfaceY?: number;
  /** Optional level mark shown on the wall (kg). */
  markKg?: number;
  hazard?: boolean;
}

/** A brass balloon whose lift follows the mass of gas inside it. */
export interface BalloonDef extends EntityBase {
  kind: 'balloon';
  body: string;
  x: number;
  z: number;
  baseY: number;
  rise: number;
  fullKg: number;
  platform: { w: number; d: number };
}

/** A metal/stone plate: condenser, warm-air vent or sun absorber. */
export interface PlateDef extends EntityBase {
  kind: 'plate';
  body: string;
  box: Box;
  role: 'condenser' | 'vent' | 'absorber' | 'bench';
  updraft?: { r: number; height: number };
  absorb?: number;
}

/** A rod made of segments; heat put in one end conducts along it. */
export interface RodDef extends EntityBase {
  kind: 'rod';
  mat: 'copper' | 'wood' | 'iron';
  from: V3;
  to: V3;
  radius: number;
  segments: number;
  T: number;
  /** Body touching the far end. */
  touches?: string;
}

export interface MirrorDef extends EntityBase {
  kind: 'mirror';
  pos: V3;
  sun: V3;
  /** kJ/s delivered to the aimed surface before absorption. */
  power: number;
  aims: { button: string; target: string; at: V3 }[];
}

export interface ButtonDef extends EntityBase {
  kind: 'button';
  box: Box;
}

/** A plunger you stand on; the pipe's contents decide what the push does. */
export interface PlungerDef extends EntityBase {
  kind: 'plunger';
  body: string;
  box: Box;
  pipe: V3[];
  bulb: V3;
}

export interface GateDef extends EntityBase {
  kind: 'gate';
  box: Box;
  /** 0 closed .. 1 open */
  open: (g: Game) => number;
  latch?: boolean;
  style?: Style;
}

/** A giant brass thermometer whose platform height is the temperature of its tank. */
export interface LiftDef extends EntityBase {
  kind: 'lift';
  body: string;
  x: number;
  z: number;
  baseY: number;
  Tmin: number;
  Tmax: number;
  height: number;
  platform: number; // radius
  tank: 'ice' | 'water' | 'iron';
}

export type EntityDef = IceDef | PoolDef | BalloonDef | PlateDef | RodDef | MirrorDef | ButtonDef | PlungerDef | GateDef | LiftDef;

export interface DrainDef {
  from: string;
  to: string;
  phase: Phase;
  /** kg per second; Infinity moves everything at once. */
  rate: number;
}

export interface AmbientDef {
  body: string;
  /** kJ/(s·°C) to the surrounding air (not scaled). */
  G: number;
}

export type Glyph = 'heat' | 'cold' | 'jump' | 'go' | 'lens' | 'step' | 'glide';

export interface HintStep {
  target: string; // entity id or 'exit'
  glyph: Glyph;
  textHe: string;
  done: (g: Game) => boolean;
  /** Not relevant right now (e.g. a recovery hint). */
  skip?: (g: Game) => boolean;
}

export interface LevelDef {
  id: string;
  index: number;
  nameHe: string;
  objectiveHe: string;
  conceptHe: string;
  spawn: V3;
  airT: number;
  battery: { start: number; capacity: number }; // kJ
  /** Battery left (kJ) at the exit that earns the efficiency star. */
  efficientAt: number;
  hints: 'always' | 'delayed' | 'none';
  statics: StaticBox[];
  bodies: BodyInit[];
  links?: { a: string; b: string; G: number }[];
  ambient?: AmbientDef[];
  drains?: DrainDef[];
  entities: EntityDef[];
  exit: V3;
  checkpoints?: V3[];
  hintSteps: HintStep[];
  /** Short worked explanation shown on the win card. */
  takeawayHe: string;
  /** Camera yaw offset (radians) – 0 looks toward −z. */
  cameraYaw?: number;
}
