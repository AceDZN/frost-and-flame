// Authored levels. Energies are in kJ (the HUD shows MJ). Masses follow the size of
// each object (ice 917 kg/m³, water 1000 kg/m³), so the gloves are very strong
// (100 MJ/s) but every number obeys Q = m·c·ΔT and Q = m·L.

import type { Game } from './game';
import type { Box } from './geom';
import type { LevelDef, StaticBox, Style } from './types';

const S = (x: number, y: number, z: number, w: number, h: number, d: number, style: Style = 'basalt', ghost = false): StaticBox => ({
  x,
  y,
  z,
  w,
  h,
  d,
  style,
  ghost,
});

const ICE = 917;
const iceMass = (b: Box) => Math.round(b.w * b.h * b.d * ICE);

/** Four rim walls around a basin area sitting on y. */
function rim(a: { x: number; z: number; w: number; d: number }, y: number, h = 0.45, t = 0.12): StaticBox[] {
  return [
    S(a.x, y, a.z - a.d / 2 - t / 2, a.w + 2 * t, h, t, 'stone'),
    S(a.x, y, a.z + a.d / 2 + t / 2, a.w + 2 * t, h, t, 'stone'),
    S(a.x - a.w / 2 - t / 2, y, a.z, t, h, a.d, 'stone'),
    S(a.x + a.w / 2 + t / 2, y, a.z, t, h, a.d, 'stone'),
  ];
}

const sinks = [
  { id: 'runoff', mat: 'water' as const, mass: 0, T: 0 },
  { id: 'co2air', mat: 'dryIce' as const, mass: 0, T: -78.5, phase: 'gas' as const },
];

const solidGone = (id: string) => (g: Game) => g.solidLeft(id) < 0.12;
const never = () => false;

// ------------------------------------------------------------------ 1. Thaw
const L1door: Box = { x: 0, y: 0, z: 1.6, w: 2.2, h: 3.1, d: 0.17 };

const level1: LevelDef = {
  id: 'thaw',
  index: 1,
  nameHe: 'הפשרה',
  objectiveHe: 'הגיעו למגדלור',
  conceptHe: 'התכה והקפאה',
  spawn: { x: 0, y: 0, z: 6.5 },
  airT: -6,
  battery: { start: 400_000, capacity: 900_000 },
  efficientAt: 250_000,
  hints: 'always',
  statics: [
    S(0, -2, 3.4, 8, 2, 11.2, 'snow'),
    S(-1.9, 0, 1.6, 1.6, 3.5, 0.9),
    S(1.9, 0, 1.6, 1.6, 3.5, 0.9),
    { ...S(-4.85, 0, 1.6, 4.3, 3.5, 0.7), visualH: 0.9 },
    { ...S(4.85, 0, 1.6, 4.3, 3.5, 0.7), visualH: 0.9 },
    S(0, 3.1, 1.6, 2.2, 0.4, 0.7),
    // creek channel
    S(0, -3, -4.7, 3, 0.5, 5.0, 'stone'),
    { ...S(-2.75, -3, -4.7, 2.5, 6, 5.0), visualH: 3.8 },
    { ...S(2.75, -3, -4.7, 2.5, 6, 5.0), visualH: 3.8 },
    S(0, -2, -10.1, 8, 2, 5.8, 'snow'),
    // borders
    { ...S(-5, -2, -2, 2, 4.6, 23), visualH: 2.7 },
    { ...S(5, -2, -2, 2, 4.6, 23), visualH: 2.7 },
    S(0, 0, 9.3, 8, 2.4, 0.6),
    S(0, 0, -13.3, 8, 2.4, 0.6),
  ],
  bodies: [
    { id: 'door', mat: 'water', mass: iceMass(L1door), T: -6 },
    { id: 'creek', mat: 'water', mass: 900, T: 1, maxT: 40 },
    ...sinks,
  ],
  drains: [{ from: 'door', to: 'runoff', phase: 'liquid', rate: 500 }],
  entities: [
    { kind: 'ice', id: 'door', labelHe: 'דלת קרח', body: 'door', box: L1door, drainTo: 'runoff', targetable: true, tint: 'clear' },
    {
      kind: 'pool',
      id: 'creek',
      labelHe: 'נחל (שכבת המים העליונה)',
      body: 'creek',
      area: { x: 0, z: -4.7, w: 3, d: 5.0 },
      floorY: -2.5,
      levelMode: 'fixed',
      surfaceY: -0.35,
      hazard: true,
      targetable: true,
    },
  ],
  exit: { x: 0, y: 0, z: -10 },
  checkpoints: [
    { x: 0, y: 0, z: 6.5 },
    { x: 0, y: 0, z: -1.2 },
    { x: 0, y: 0, z: -8.5 },
  ],
  hintSteps: [
    { target: 'door', glyph: 'heat', textHe: 'החזיקו כדי לחמם את דלת הקרח', done: solidGone('door') },
    { target: 'creek', glyph: 'cold', textHe: 'החזיקו כדי לשאוב חום מהנחל — עד שיקפא', done: (g) => g.body('creek').state.frac.solid >= 0.97 },
    { target: 'exit', glyph: 'go', textHe: 'למגדלור!', done: never },
  ],
  takeawayHe:
    'הקרח נמס ב־0°C — והמדחום נשאר על 0°C עד שכל הקרח נמס. כשהנחל קפא, המים מסרו חום, והסוללה נטענה. החלקיקים לא עוצרים: במוצק הם רק רוטטים במקום.',
};

// ------------------------------------------------------------------ 2. Steam Lift
const L2basin = { x: -2.2, z: -2.6, w: 0.8, d: 0.8 };
const L2tank = { x: 1.6, z: -6.6, w: 0.7, d: 0.6 };
const L2fullKg = 150;
const tankKg = (g: Game) => g.body('tank').mass;

const level2: LevelDef = {
  id: 'steam',
  index: 2,
  nameHe: 'מעלית קיטור',
  objectiveHe: 'עלו אל המצוק',
  conceptHe: 'רתיחה, עיבוי ושימור מסה',
  spawn: { x: 0.5, y: 0, z: 3 },
  airT: -6,
  battery: { start: 520_000, capacity: 1_200_000 },
  efficientAt: 350_000,
  hints: 'always',
  statics: [
    S(0, -2, 0, 9, 2, 9, 'snow'),
    S(0, 0, -8.5, 9, 4.5, 8, 'basalt'),
    { ...S(-5.5, -2, -4, 2, 9, 18), visualH: 2.7 },
    { ...S(5.5, -2, -4, 2, 9, 18), visualH: 2.7 },
    S(0, 0, 4.8, 9, 2.4, 0.6),
    S(0, 4.5, -12.8, 9, 2.4, 0.6),
    S(L2basin.x, 0, L2basin.z, 1.06, 0.45, 1.06, 'stone'),
    ...rim(L2basin, 0.45, 0.35),
    ...rim(L2tank, 4.5, 0.55),
    S(-2.9, 4.5, -9.5, 3.4, 3.2, 0.4),
    S(2.9, 4.5, -9.5, 3.4, 3.2, 0.4),
  ],
  bodies: [
    { id: 'basin', mat: 'water', mass: L2fullKg, T: -8, maxT: 200 },
    { id: 'balloon', mat: 'water', mass: 0, T: 100, phase: 'gas' },
    { id: 'plate', mat: 'copper', mass: 40, T: -6, minT: -30 },
    { id: 'tank', mat: 'water', mass: 0, T: 20 },
    ...sinks,
  ],
  links: [{ a: 'plate', b: 'balloon', G: 3000 }],
  ambient: [{ body: 'tank', G: 3 }],
  drains: [
    { from: 'basin', to: 'balloon', phase: 'gas', rate: Infinity },
    { from: 'balloon', to: 'tank', phase: 'liquid', rate: 60 },
  ],
  entities: [
    {
      kind: 'pool',
      id: 'basin',
      labelHe: 'אגן',
      body: 'basin',
      area: L2basin,
      floorY: 0.45,
      levelMode: 'volume',
      markKg: L2fullKg,
      targetable: true,
    },
    {
      kind: 'balloon',
      id: 'balloon',
      labelHe: 'בלון אדים',
      body: 'balloon',
      x: 0.8,
      z: -3.2,
      baseY: 0.35,
      rise: 4.15,
      fullKg: L2fullKg,
      platform: { w: 2.2, d: 2.2 },
      targetable: true,
    },
    { kind: 'plate', id: 'plate', labelHe: 'לוח מעבה (נחושת)', body: 'plate', role: 'condenser', box: { x: -1.6, y: 4.5, z: -6.0, w: 0.7, h: 1.0, d: 0.7 }, targetable: true },
    {
      kind: 'pool',
      id: 'tank',
      labelHe: 'מכל ריק',
      body: 'tank',
      area: L2tank,
      floorY: 4.5,
      levelMode: 'volume',
      markKg: L2fullKg,
    },
    {
      kind: 'gate',
      id: 'gate',
      labelHe: 'שער מצוף',
      box: { x: 0, y: 4.5, z: -9.5, w: 2.4, h: 2.8, d: 0.4 },
      open: (g) => (tankKg(g) >= L2fullKg - 5 ? 1 : (0.3 * tankKg(g)) / L2fullKg),
      latch: true,
      style: 'brass',
    },
  ],
  exit: { x: 0, y: 4.5, z: -11.3 },
  checkpoints: [
    { x: 0.5, y: 0, z: 3 },
    { x: 0, y: 4.5, z: -5.2 },
  ],
  hintSteps: [
    {
      target: 'balloon',
      glyph: 'cold',
      textHe: 'הבלון עלה בלעדיכם — קררו אותו כדי שיירד',
      done: never,
      skip: (g) => !(g.body('balloon').massOf('gas') > 20 && g.player.groundId !== 'balloon' && g.player.pos.y < 3),
    },
    { target: 'balloon', glyph: 'step', textHe: 'עלו על רציף הבלון', done: (g) => g.player.groundId === 'balloon' || g.player.pos.y > 4.2 },
    {
      target: 'basin',
      glyph: 'heat',
      textHe: 'חממו את האגן: קרח ← מים ← אדים',
      done: (g) => g.balloonTop(g.entity<'balloon'>('balloon')) >= 4.45 || g.player.pos.y > 4.2,
    },
    { target: 'plate', glyph: 'cold', textHe: 'קררו את לוח הנחושת — האדים יתעבו למים', done: (g) => tankKg(g) >= L2fullKg - 5 },
    { target: 'exit', glyph: 'go', textHe: 'למגדלור!', done: never },
  ],
  takeawayHe:
    '150 ק״ג קרח הפכו ל־150 ק״ג מים, ל־150 ק״ג אדים (שתפסו בלון ענק!) ושוב ל־150 ק״ג מים. במעבר בין מצבי צבירה המסה לא משתנה — רק הסידור והמרחקים בין החלקיקים. האדים עצמם שקופים; הענן הלבן הוא טיפות זעירות.',
};

// ------------------------------------------------------------------ 3. Heat Paths
const L3lock: Box = { x: 0, y: 2.6, z: -0.75, w: 0.38, h: 0.38, d: 0.38 };
const L3latch: Box = { x: 0, y: 2.6, z: -10.75, w: 0.4, h: 0.4, d: 0.4 };

const glassWall = (z: number, gateW: number, top = 3.6, half = 4.5): StaticBox[] => [
  S(-(half + gateW / 2) / 2, 0, z, half - gateW / 2, top, 0.2, 'glass'),
  S((half + gateW / 2) / 2, 0, z, half - gateW / 2, top, 0.2, 'glass'),
  S(0, 2.5, z, gateW, top - 2.5, 0.2, 'glass'),
];

const level3: LevelDef = {
  id: 'paths',
  index: 3,
  nameHe: 'שבילי חום',
  objectiveHe: 'עברו את קירות הזכוכית',
  conceptHe: 'הולכה, קרינה והסעה',
  spawn: { x: 0, y: 0, z: 6 },
  airT: -8,
  battery: { start: 320_000, capacity: 900_000 },
  efficientAt: 150_000,
  hints: 'delayed',
  statics: [
    S(0, -2, -6, 9, 2, 30, 'snow'),
    { ...S(-5.5, -2, -6, 2, 10, 30), visualH: 2.7 },
    { ...S(5.5, -2, -6, 2, 10, 30), visualH: 2.7 },
    S(0, 0, 9.3, 9, 2.4, 0.6),
    ...glassWall(0, 1.6),
    ...glassWall(-10, 1.6),
    S(0, 0, -19, 9, 5.2, 4, 'basalt'),
    S(0, 2.2, -0.75, 0.6, 0.38, 0.5, 'brass', true),
    S(0.45, 2.2, -10.75, 1.2, 0.2, 0.6, 'brass', true),
  ],
  bodies: [
    { id: 'lock', mat: 'water', mass: iceMass(L3lock), T: -8 },
    { id: 'latch', mat: 'water', mass: iceMass(L3latch), T: -8 },
    { id: 'dark', mat: 'basalt', mass: 375, T: -8, maxT: 400 },
    { id: 'vent', mat: 'iron', mass: 1234, T: -8, maxT: 160 },
    { id: 'ironBench', mat: 'iron', mass: 120, T: -8, maxT: 40 },
    { id: 'woodBench', mat: 'wood', mass: 40, T: -8, maxT: 40 },
    ...sinks,
  ],
  links: [{ a: 'dark', b: 'latch', G: 60 }],
  ambient: [
    { body: 'latch', G: 80 },
    { body: 'dark', G: 30 },
    { body: 'vent', G: 25 },
  ],
  drains: [
    { from: 'lock', to: 'runoff', phase: 'liquid', rate: 200 },
    { from: 'latch', to: 'runoff', phase: 'liquid', rate: 200 },
  ],
  entities: [
    { kind: 'plate', id: 'ironBench', labelHe: 'ספסל ברזל', body: 'ironBench', role: 'bench', box: { x: -3.4, y: 0, z: 5.2, w: 1.0, h: 0.5, d: 1.6 }, targetable: true },
    { kind: 'plate', id: 'woodBench', labelHe: 'ספסל עץ', body: 'woodBench', role: 'bench', box: { x: 3.4, y: 0, z: 5.2, w: 1.0, h: 0.5, d: 1.6 }, targetable: true },
    { kind: 'rod', id: 'copperRod', labelHe: 'מוט נחושת', mat: 'copper', from: { x: -2.0, y: 1.1, z: 1.3 }, to: { x: -0.22, y: 2.75, z: -0.75 }, radius: 0.06, segments: 5, T: -8, touches: 'lock', targetable: true },
    { kind: 'rod', id: 'woodRod', labelHe: 'מוט עץ', mat: 'wood', from: { x: 2.0, y: 1.1, z: 1.3 }, to: { x: 0.22, y: 2.75, z: -0.75 }, radius: 0.06, segments: 5, T: -8, touches: 'lock', targetable: true },
    { kind: 'ice', id: 'lock', labelHe: 'מנעול קרח', body: 'lock', box: L3lock, drainTo: 'runoff', targetable: true, tint: 'clear' },
    { kind: 'gate', id: 'gate1', labelHe: 'שער', box: { x: 0, y: 0, z: 0, w: 1.6, h: 2.5, d: 0.25 }, open: (g) => (g.solidLeft('lock') < 0.12 ? 1 : 0), latch: true, style: 'brass' },
    {
      kind: 'mirror',
      id: 'mirror',
      labelHe: 'מראת שמש',
      pos: { x: -3.4, y: 2.0, z: -5.0 },
      sun: { x: -4.6, y: 9, z: -1.5 },
      power: 12_000,
      aims: [
        { button: 'btnWhite', target: 'latch', at: { x: 0, y: 2.8, z: -10.75 } },
        { button: 'btnDark', target: 'dark', at: { x: 0.45, y: 2.65, z: -10.75 } },
      ],
    },
    { kind: 'button', id: 'btnWhite', labelHe: 'כוונו לבריח הלבן', box: { x: -1.5, y: 0, z: -6.5, w: 1.1, h: 0.12, d: 1.1 } },
    { kind: 'button', id: 'btnDark', labelHe: 'כוונו לאבן הכהה', box: { x: 1.5, y: 0, z: -6.5, w: 1.1, h: 0.12, d: 1.1 } },
    { kind: 'ice', id: 'latch', labelHe: 'בריח שלג לבן', body: 'latch', box: L3latch, drainTo: 'runoff', absorb: 0.05, targetable: true, tint: 'white' },
    { kind: 'plate', id: 'dark', labelHe: 'אבן בזלת כהה', body: 'dark', role: 'absorber', box: { x: 0.45, y: 2.4, z: -10.75, w: 0.5, h: 0.5, d: 0.5 }, absorb: 0.9, targetable: true },
    { kind: 'gate', id: 'gate2', labelHe: 'שער', box: { x: 0, y: 0, z: -10, w: 1.6, h: 2.5, d: 0.25 }, open: (g) => (g.solidLeft('latch') < 0.12 ? 1 : 0), latch: true, style: 'brass' },
    { kind: 'plate', id: 'vent', labelHe: 'לוח ברזל (פתח אוורור)', body: 'vent', role: 'vent', box: { x: 0, y: 0, z: -14.5, w: 1.4, h: 0.08, d: 1.4 }, updraft: { r: 1.1, height: 6.3 }, targetable: true },
  ],
  exit: { x: 0, y: 5.2, z: -19.3 },
  checkpoints: [
    { x: 0, y: 0, z: 6 },
    { x: 0, y: 0, z: -2.2 },
    { x: 0, y: 0, z: -12 },
  ],
  hintSteps: [
    { target: 'copperRod', glyph: 'heat', textHe: 'הזכוכית חוסמת את הכפפה. חממו מוט שמוליך חום טוב', done: solidGone('lock') },
    { target: 'btnDark', glyph: 'step', textHe: 'דרכו על הכפתור שמכוון את המראה לאבן הכהה', done: solidGone('latch') },
    { target: 'vent', glyph: 'heat', textHe: 'חממו את לוח הברזל — האוויר מעליו יתחמם ויעלה', done: (g) => g.updraftStrength('vent') > 1.5 || g.player.pos.y > 4.5 },
    { target: 'vent', glyph: 'glide', textHe: 'עמדו על הלוח, קפצו והחזיקו קפיצה', done: (g) => g.player.pos.y > 4.9 },
    { target: 'exit', glyph: 'go', textHe: 'למגדלור!', done: never },
  ],
  takeawayHe:
    'חום עובר בשלוש דרכים: הולכה — בנחושת מהר, בעץ כמעט לא; קרינה — אור השמש עובר דרך זכוכית ונבלע במשטח כהה, ומשטח לבן מחזיר אותו; הסעה — אוויר חם עולה ונושא אתכם. במשחק ההולכה מואצת מאוד: במציאות חום עובר לאורך מוט נחושת של 3 מ׳ בערך יממה, ולאורך מוט עץ — שנים.',
};

// ------------------------------------------------------------------ 4. Squeeze
const L4dry: Box = { x: 0, y: 0, z: 0, w: 1.0, h: 1.6, d: 0.18 };

const level4: LevelDef = {
  id: 'squeeze',
  index: 4,
  nameHe: 'לחץ',
  objectiveHe: 'פתחו את השער הכבד',
  conceptHe: 'המראה ודחיסות',
  spawn: { x: 0, y: 0, z: 5 },
  airT: -8,
  battery: { start: 400_000, capacity: 900_000 },
  efficientAt: 40_000,
  hints: 'delayed',
  statics: [
    S(0, -2, -5, 9, 2, 26, 'snow'),
    { ...S(-5.5, -2, -5, 2, 7, 26), visualH: 2.7 },
    { ...S(5.5, -2, -5, 2, 7, 26), visualH: 2.7 },
    S(0, 0, 8.3, 9, 2.4, 0.6),
    S(-1.25, 0, 0, 1.5, 3.5, 1.2),
    S(1.25, 0, 0, 1.5, 3.5, 1.2),
    { ...S(-3.25, 0, 0, 2.5, 3.5, 1.2), visualH: 1.0 },
    { ...S(3.25, 0, 0, 2.5, 3.5, 1.2), visualH: 1.0 },
    S(0, 1.6, 0, 1.0, 1.9, 1.2),
    S(-2.8, 0, -10, 3.4, 4, 0.4),
    S(2.8, 0, -10, 3.4, 4, 0.4),
    S(0, 2.8, -10, 2.2, 1.2, 0.4),
    S(0, 0, -17.3, 9, 2.4, 0.6),
    S(-2, 0, -5.2, 0.35, 0.8, 0.35, 'brass'),
    S(2, 0, -5.2, 0.35, 0.8, 0.35, 'brass'),
  ],
  bodies: [
    { id: 'dry', mat: 'dryIce', mass: Math.round(L4dry.w * L4dry.h * L4dry.d * 1560), T: -78.5, phase: 'solid', minT: -100 },
    { id: 'airpipe', mat: 'air', mass: 2, T: -8, maxT: -8 },
    { id: 'waterpipe', mat: 'water', mass: 200, T: -12, maxT: 95 },
    ...sinks,
  ],
  ambient: [{ body: 'dry', G: 4 }],
  drains: [{ from: 'dry', to: 'co2air', phase: 'gas', rate: Infinity }],
  entities: [
    { kind: 'ice', id: 'dry', labelHe: 'קרח יבש', body: 'dry', box: L4dry, drainTo: 'co2air', targetable: true, tint: 'dry' },
    { kind: 'plunger', id: 'plA', labelHe: 'בוכנה — צינור אוויר', body: 'airpipe', box: { x: -2, y: 0, z: -3.6, w: 1.3, h: 0.4, d: 1.3 }, bulb: { x: -2, y: 1.1, z: -5.2 }, pipe: [{ x: -2, y: 0.2, z: -4.3 }, { x: -2, y: 0.2, z: -8.2 }, { x: -0.6, y: 0.2, z: -9.2 }], targetable: true },
    { kind: 'plunger', id: 'plB', labelHe: 'בוכנה — צינור מים', body: 'waterpipe', box: { x: 2, y: 0, z: -3.6, w: 1.3, h: 0.4, d: 1.3 }, bulb: { x: 2, y: 1.1, z: -5.2 }, pipe: [{ x: 2, y: 0.2, z: -4.3 }, { x: 2, y: 0.2, z: -8.2 }, { x: 0.6, y: 0.2, z: -9.2 }], targetable: true },
    {
      kind: 'gate',
      id: 'gate',
      labelHe: 'שער הידראולי',
      box: { x: 0, y: 0, z: -10, w: 2.2, h: 2.8, d: 0.4 },
      open: (g) => Math.max(g.plungerPush('plA'), g.plungerPush('plB')),
      latch: true,
      style: 'brass',
    },
  ],
  exit: { x: 0, y: 0, z: -14 },
  checkpoints: [
    { x: 0, y: 0, z: 5 },
    { x: 0, y: 0, z: -2 },
  ],
  hintSteps: [
    { target: 'dry', glyph: 'heat', textHe: 'חממו את הקרח היבש — שימו לב: אין שלולית', done: solidGone('dry') },
    { target: 'plA', glyph: 'step', textHe: 'עמדו על בוכנה ותראו מה קורה לשער', done: (g) => g.learn.some((l) => l.action.startsWith('plunger')) },
    {
      target: 'plB',
      glyph: 'heat',
      textHe: 'הצינור הזה מלא קרח ונעול. המיסו אותו',
      done: (g) => g.body('waterpipe').state.frac.solid < 0.5,
      skip: (g) => g.latched.has('gate'),
    },
    { target: 'plB', glyph: 'step', textHe: 'עכשיו עמדו על בוכנת המים', done: (g) => g.latched.has('gate') },
    { target: 'exit', glyph: 'go', textHe: 'למגדלור!', done: never },
  ],
  takeawayHe:
    'קרח יבש (CO₂) הופך ישר לגז שקוף — המראה, בלי שלב נוזל. הערפל הלבן הוא טיפות מים מהאוויר שהתקררו ליד הקרח היבש — הפחמן הדו־חמצני עצמו שקוף. גז נדחס: הבוכנה שוקעת וקופצת חזרה. נוזל כמעט לא נדחס, ולכן הדחיפה עוברת דרכו עד השער (הידראוליקה). מוצק לא נדחס וגם לא זורם — הקרח תקוע בצינור ונועל אותו.',
};

// ------------------------------------------------------------------ 5. Plateau (grade 9)
const level5: LevelDef = {
  id: 'plateau',
  index: 5,
  nameHe: 'מישור',
  objectiveHe: 'טפסו בעזרת מעליות המדחום',
  conceptHe: 'חום כמוס וחום סגולי (כיתה ט׳)',
  spawn: { x: 0, y: 0, z: 3.5 },
  airT: -10,
  battery: { start: 200_000, capacity: 300_000 },
  efficientAt: 80_000,
  hints: 'delayed',
  statics: [
    S(0, -2, 1, 10, 2, 11, 'snow'),
    S(0, 0, -7.5, 10, 3.4, 6, 'basalt'),
    S(0, 0, -14.25, 10, 7.75, 7.5, 'basalt'),
    { ...S(-6, -2, -6, 2, 14, 26), visualH: 2.7 },
    { ...S(6, -2, -6, 2, 14, 26), visualH: 2.7 },
    S(0, 0, 6.3, 10, 2.4, 0.6),
    { ...S(0, 7.75, -17.7, 10, 3, 0.4), visualH: 0.7 },
  ],
  bodies: [
    { id: 'iceBig', mat: 'water', mass: 1000, T: -10 },
    { id: 'iceSmall', mat: 'water', mass: 120, T: -10 },
    { id: 'waterTank', mat: 'water', mass: 1500, T: 20, maxT: 120 },
    { id: 'ironTank', mat: 'iron', mass: 1500, T: 20, maxT: 120 },
    ...sinks,
  ],
  entities: [
    { kind: 'lift', id: 'liftBig', labelHe: 'מעלית קרח — 1000 ק״ג', body: 'iceBig', x: -2.2, z: -3.7, baseY: 0, Tmin: -10, Tmax: 110, height: 6, platform: 0.75, tank: 'ice', targetable: true },
    { kind: 'lift', id: 'liftSmall', labelHe: 'מעלית קרח — 120 ק״ג', body: 'iceSmall', x: 2.2, z: -3.7, baseY: 0, Tmin: -10, Tmax: 110, height: 6, platform: 0.75, tank: 'ice', targetable: true },
    { kind: 'lift', id: 'liftWater', labelHe: 'מעלית מים — 1500 ק״ג', body: 'waterTank', x: -2.2, z: -9.75, baseY: 3.4, Tmin: 20, Tmax: 140, height: 6, platform: 0.75, tank: 'water', targetable: true },
    { kind: 'lift', id: 'liftIron', labelHe: 'מעלית ברזל — 1500 ק״ג', body: 'ironTank', x: 2.2, z: -9.75, baseY: 3.4, Tmin: 20, Tmax: 140, height: 6, platform: 0.75, tank: 'iron', targetable: true },
  ],
  exit: { x: 0, y: 7.75, z: -15 },
  checkpoints: [
    { x: 0, y: 0, z: 3.5 },
    { x: 0, y: 3.4, z: -6 },
    { x: 0, y: 7.75, z: -12.5 },
  ],
  hintSteps: [
    {
      target: 'liftSmall',
      glyph: 'heat',
      textHe: 'המדחום נתקע על 0°C בזמן שהקרח נמס. גוש קטן יותר צריך פחות חום כדי להימס',
      done: (g) => g.player.pos.y > 3.3,
    },
    { target: 'liftIron', glyph: 'heat', textHe: 'אותה מסה, אותו חום: הברזל מתחמם הרבה יותר מהמים', done: (g) => g.player.pos.y > 7.6 },
    { target: 'exit', glyph: 'go', textHe: 'למגדלור!', done: never },
  ],
  takeawayHe:
    'חום וטמפרטורה הם לא אותו דבר. בזמן ההתכה כל החום שובר את הקשרים בין החלקיקים, והטמפרטורה עומדת (חום כמוס, Q = m·L) — לגוש גדול צריך הרבה יותר. ולמים חום סגולי גבוה: Q = m·c·ΔT, ולכן אותו חום מעלה את הטמפרטורה של ברזל בערך פי 9 יותר מאשר של אותה מסת מים.',
};

// ------------------------------------------------------------------ 6. The Observatory (transfer)
const L6glacier: Box = { x: 0, y: 0, z: 4, w: 3, h: 3.4, d: 1.2 };
const L6plug: Box = { x: 3.6, y: 0, z: 4, w: 1.2, h: 1.8, d: 0.25 };
const L6fountain = { x: -3.5, z: 8, w: 1.6, d: 1.6 };
const L6basin = { x: -2.4, z: -8.6, w: 0.8, d: 0.8 };
const L6latch: Box = { x: 0, y: 7.1, z: -15.75, w: 0.38, h: 0.38, d: 0.38 };
const L6basinKg = 120;

const level6: LevelDef = {
  id: 'observatory',
  index: 6,
  nameHe: 'המצפה',
  objectiveHe: 'הגיעו אל הטלסקופ',
  conceptHe: 'משימת העברה — בלי רמזים',
  spawn: { x: 0, y: 0, z: 10 },
  airT: -12,
  battery: { start: 150_000, capacity: 600_000 },
  efficientAt: 40_000,
  hints: 'none',
  statics: [
    S(0, -2, 6.25, 12, 2, 13.5, 'snow'),
    { ...S(-6.5, -2, -5, 1, 16, 36), visualH: 2.7 },
    { ...S(6.5, -2, -5, 1, 16, 36), visualH: 2.7 },
    S(0, 0, 12.8, 12, 2.4, 0.6),
    // wall with the glacier and the side plug
    S(-3.75, 0, 4, 4.5, 3.6, 1.2),
    S(2.25, 0, 4, 1.5, 3.6, 1.2),
    S(5.1, 0, 4, 1.8, 3.6, 1.2),
    S(3.6, 1.8, 4, 1.2, 1.8, 1.2),
    S(0, 3.4, 4, 3, 0.2, 1.2),
    S(L6fountain.x, 0, L6fountain.z, 1.84, 0.4, 1.84, 'stone'),
    ...rim(L6fountain, 0.4, 0.35),
    // creek channel
    S(0, -3, -3.0, 3, 0.5, 5.0, 'stone'),
    { ...S(-3.75, -3, -3.0, 4.5, 6, 5.0), visualH: 3.8 },
    { ...S(3.75, -3, -3.0, 4.5, 6, 5.0), visualH: 3.8 },
    S(0, -2, -9.0, 12, 2, 7.0, 'snow'),
    // observatory deck
    S(0, 0, -17.85, 12, 4.5, 10.3, 'basalt'),
    S(L6basin.x, 0, L6basin.z, 1.06, 0.45, 1.06, 'stone'),
    ...rim(L6basin, 0.45, 0.35),
    ...glassWall(-15, 1.6, 3.6, 6).map((s) => ({ ...s, y: s.y + 4.5 })),
    S(0, 4.5, -20.5, 12, 5.0, 3, 'basalt'),
    { ...S(0, 9.5, -21.8, 12, 3, 0.4), visualH: 0.7 },
    { ...S(0, 4.5, -22.8, 12, 3, 0.4), visualH: 0.7 },
    S(0, 6.6, -15.75, 0.6, 0.5, 0.5, 'brass', true),
  ],
  bodies: [
    { id: 'glacier', mat: 'water', mass: iceMass(L6glacier), T: -12 },
    { id: 'plug', mat: 'water', mass: iceMass(L6plug), T: -12 },
    { id: 'fountain', mat: 'water', mass: 450, T: 2, maxT: 60 },
    { id: 'creek', mat: 'water', mass: 900, T: 4, maxT: 40 },
    { id: 'basin', mat: 'water', mass: L6basinKg, T: 10, maxT: 200 },
    { id: 'balloon', mat: 'water', mass: 0, T: 100, phase: 'gas' },
    { id: 'latch', mat: 'water', mass: iceMass(L6latch), T: -12 },
    { id: 'waterTank', mat: 'water', mass: 1000, T: 4, maxT: 120 },
    { id: 'ironTank', mat: 'iron', mass: 600, T: 4, maxT: 160 },
    ...sinks,
  ],
  drains: [
    { from: 'glacier', to: 'runoff', phase: 'liquid', rate: 500 },
    { from: 'plug', to: 'runoff', phase: 'liquid', rate: 500 },
    { from: 'latch', to: 'runoff', phase: 'liquid', rate: 200 },
    { from: 'basin', to: 'balloon', phase: 'gas', rate: Infinity },
    { from: 'balloon', to: 'basin', phase: 'liquid', rate: 60 },
  ],
  entities: [
    { kind: 'ice', id: 'glacier', labelHe: 'קרחון', body: 'glacier', box: L6glacier, drainTo: 'runoff', targetable: true, tint: 'clear' },
    { kind: 'ice', id: 'plug', labelHe: 'פקק קרח', body: 'plug', box: L6plug, drainTo: 'runoff', targetable: true, tint: 'clear' },
    { kind: 'pool', id: 'fountain', labelHe: 'מזרקה', body: 'fountain', area: L6fountain, floorY: 0.4, levelMode: 'volume', targetable: true },
    { kind: 'pool', id: 'creek', labelHe: 'נחל (שכבת המים העליונה)', body: 'creek', area: { x: 0, z: -3.0, w: 3, d: 5.0 }, floorY: -2.5, levelMode: 'fixed', surfaceY: -0.35, hazard: true, targetable: true },
    { kind: 'pool', id: 'basin', labelHe: 'אגן', body: 'basin', area: L6basin, floorY: 0.45, levelMode: 'volume', markKg: L6basinKg, targetable: true },
    { kind: 'balloon', id: 'balloon', labelHe: 'בלון אדים', body: 'balloon', x: 0.8, z: -11.5, baseY: 0.35, rise: 4.15, fullKg: L6basinKg, platform: { w: 2.2, d: 2.2 }, targetable: true },
    { kind: 'rod', id: 'copperRod', labelHe: 'מוט נחושת', mat: 'copper', from: { x: 2.0, y: 5.6, z: -13.7 }, to: { x: 0.22, y: 7.25, z: -15.75 }, radius: 0.06, segments: 5, T: -12, touches: 'latch', targetable: true },
    { kind: 'rod', id: 'woodRod', labelHe: 'מוט עץ', mat: 'wood', from: { x: -2.0, y: 5.6, z: -13.7 }, to: { x: -0.22, y: 7.25, z: -15.75 }, radius: 0.06, segments: 5, T: -12, touches: 'latch', targetable: true },
    { kind: 'ice', id: 'latch', labelHe: 'מנעול קרח', body: 'latch', box: L6latch, drainTo: 'runoff', targetable: true, tint: 'clear' },
    { kind: 'gate', id: 'domeDoor', labelHe: 'דלת הכיפה', box: { x: 0, y: 4.5, z: -15, w: 1.6, h: 2.5, d: 0.25 }, open: (g) => (g.solidLeft('latch') < 0.12 ? 1 : 0), latch: true, style: 'brass' },
    { kind: 'lift', id: 'liftIron', labelHe: 'מעלית ברזל — 600 ק״ג', body: 'ironTank', x: -1.8, z: -18.2, baseY: 4.5, Tmin: 4, Tmax: 144, height: 7, platform: 0.75, tank: 'iron', targetable: true },
    { kind: 'lift', id: 'liftWater', labelHe: 'מעלית מים — 1000 ק״ג', body: 'waterTank', x: 1.8, z: -18.2, baseY: 4.5, Tmin: 4, Tmax: 144, height: 7, platform: 0.75, tank: 'water', targetable: true },
  ],
  exit: { x: 0, y: 9.5, z: -20.6 },
  checkpoints: [
    { x: 0, y: 0, z: 10 },
    { x: 3.6, y: 0, z: 2.6 },
    { x: 0, y: 0, z: 1.6 },
    { x: 0, y: 0, z: 0.2 },
    { x: 0, y: 0, z: -6.5 },
    { x: 0, y: 4.5, z: -13 },
    { x: 0, y: 4.5, z: -16.6 },
  ],
  hintSteps: [],
  takeawayHe:
    'פתרתם את המצפה בלי רמזים: אנרגיה לא נוצרת יש מאין — קיבלתם אותה מהקפאת מים, השקעתם אותה בהתכה, ברתיחה ובחימום, ובחרתם בדרך היעילה. ניסיון לחמם הכול היה מרוקן את הסוללה.',
};

export const LEVELS: LevelDef[] = [level1, level2, level3, level4, level5, level6];
