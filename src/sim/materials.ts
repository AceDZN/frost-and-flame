// Material data. Units: c in kJ/(kg·°C), latent heat in kJ/kg, temperatures in °C.
// Values are textbook values at normal pressure. Conductivity `k` is in W/(m·°C);
// the game multiplies all conductances by one shared factor (see thermal.ts) so the
// ratios between materials stay real while puzzles finish in seconds.

export type Phase = 'solid' | 'liquid' | 'gas';
export type MaterialId = 'water' | 'dryIce' | 'copper' | 'iron' | 'wood' | 'basalt' | 'air';

export interface Transition {
  at: number; // °C
  L: number; // kJ/kg
  from: Phase;
  to: Phase;
}

export interface Material {
  id: MaterialId;
  nameHe: string;
  /** Name of each phase in Hebrew (Workbook terms). */
  phaseNameHe: Partial<Record<Phase, string>>;
  formula?: string;
  c: Partial<Record<Phase, number>>;
  transitions: Transition[];
  k: number;
  /** Fraction of sunlight absorbed by the surface (0..1). */
  absorb: number;
  density: Partial<Record<Phase, number>>; // kg/m³ (gas at its transition point, 1 atm)
  /** Phase below the first transition (default solid). */
  basePhase?: Phase;
}

export const MATERIALS: Record<MaterialId, Material> = {
  water: {
    id: 'water',
    nameHe: 'מים',
    phaseNameHe: { solid: 'קרח', liquid: 'מים', gas: 'אדי מים' },
    formula: 'H₂O',
    c: { solid: 2.1, liquid: 4.18, gas: 2.0 },
    transitions: [
      { at: 0, L: 334, from: 'solid', to: 'liquid' },
      { at: 100, L: 2260, from: 'liquid', to: 'gas' },
    ],
    k: 2.2, // ice; liquid water ≈ 0.6
    absorb: 0.35,
    density: { solid: 917, liquid: 1000, gas: 0.6 },
  },
  dryIce: {
    id: 'dryIce',
    nameHe: 'קרח יבש',
    phaseNameHe: { solid: 'קרח יבש', gas: 'פחמן דו־חמצני' },
    formula: 'CO₂',
    c: { solid: 0.95, gas: 0.84 },
    transitions: [{ at: -78.5, L: 571, from: 'solid', to: 'gas' }],
    k: 0.6,
    absorb: 0.3,
    density: { solid: 1560, gas: 2.8 },
  },
  copper: {
    id: 'copper',
    nameHe: 'נחושת',
    phaseNameHe: { solid: 'נחושת' },
    formula: 'Cu',
    c: { solid: 0.385 },
    transitions: [],
    k: 400,
    absorb: 0.3,
    density: { solid: 8960 },
  },
  iron: {
    id: 'iron',
    nameHe: 'ברזל',
    phaseNameHe: { solid: 'ברזל' },
    formula: 'Fe',
    c: { solid: 0.45 },
    transitions: [],
    k: 80,
    absorb: 0.6,
    density: { solid: 7870 },
  },
  wood: {
    id: 'wood',
    nameHe: 'עץ',
    phaseNameHe: { solid: 'עץ' },
    c: { solid: 1.7 },
    transitions: [],
    k: 0.15,
    absorb: 0.6,
    density: { solid: 600 },
  },
  air: {
    id: 'air',
    nameHe: 'אוויר',
    phaseNameHe: { gas: 'אוויר' },
    c: { gas: 1.0 },
    transitions: [],
    k: 0.025,
    absorb: 0,
    density: { gas: 1.3 },
    basePhase: 'gas',
  },
  basalt: {
    id: 'basalt',
    nameHe: 'בזלת',
    phaseNameHe: { solid: 'בזלת' },
    c: { solid: 0.84 },
    transitions: [],
    k: 2,
    absorb: 0.9,
    density: { solid: 3000 },
  },
};

export const PHASE_HE: Record<Phase, string> = { solid: 'מוצק', liquid: 'נוזל', gas: 'גז' };
