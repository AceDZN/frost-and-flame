import { describe, expect, it } from 'vitest';
import { Body, HeatBattery, ThermalSystem, transferMass } from '../src/sim/thermal';

const close = (a: number, b: number, eps = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(eps);

describe('heating curve of water', () => {
  it('needs m·c·ΔT + m·L for each stage (ice −10 °C → steam 100 °C)', () => {
    const b = new Body({ id: 'w', mat: 'water', mass: 2, T: -10 });
    const want = 2 * 2.1 * 10 + 2 * 334 + 2 * 4.18 * 100 + 2 * 2260;
    // heating up to a transition point counts the whole plateau (ends as gas)
    close(b.energyTo(100), want, 1e-6);
    b.addHeat(want);
    expect(b.T).toBe(100);
    close(b.state.frac.gas, 1);
  });

  it('holds at 0 °C until all the ice has melted (plateau)', () => {
    const b = new Body({ id: 'w', mat: 'water', mass: 1, T: -5 });
    const temps: number[] = [];
    for (let i = 0; i < 400; i++) {
      b.addHeat(1); // 1 kJ at a time
      temps.push(b.T);
    }
    const atZero = temps.filter((t) => t === 0).length;
    // −5 → 0 takes 10.5 kJ; melting takes 334 kJ — all at exactly 0 °C.
    expect(atZero).toBeGreaterThanOrEqual(333);
    expect(temps[400 - 1]).toBeGreaterThan(0);
    // while melting, temperature does not rise even though heat keeps flowing in
    const mid = new Body({ id: 'm', mat: 'water', mass: 1, T: 0, phase: 'solid' });
    mid.addHeat(100);
    expect(mid.T).toBe(0);
    expect(mid.state.changing?.from).toBe('solid');
    close(mid.state.frac.liquid, 100 / 334);
  });

  it('holds at 100 °C while boiling', () => {
    const b = new Body({ id: 'w', mat: 'water', mass: 1, T: 100, phase: 'liquid' });
    b.addHeat(1000);
    expect(b.T).toBe(100);
    close(b.state.frac.gas, 1000 / 2260);
  });

  it('dry ice turns straight into gas at −78.5 °C (no liquid)', () => {
    const b = new Body({ id: 'c', mat: 'dryIce', mass: 1, T: -90 });
    for (let i = 0; i < 700; i++) {
      b.addHeat(1);
      expect(b.state.frac.liquid).toBe(0);
    }
    expect(b.state.frac.gas).toBe(1);
  });

  it('mass never changes during a phase change', () => {
    const b = new Body({ id: 'w', mat: 'water', mass: 3.5, T: -20 });
    for (let i = 0; i < 100; i++) {
      b.addHeat(100);
      expect(b.mass).toBe(3.5);
      const f = b.state.frac;
      close(f.solid + f.liquid + f.gas, 1);
    }
  });

  it('cooling releases exactly the energy that heating took (freezing gives heat back)', () => {
    const b = new Body({ id: 'w', mat: 'water', mass: 1, T: 5 });
    const out = -b.energyTo(-5);
    close(out, 1 * 4.18 * 5 + 334 + 1 * 2.1 * 5, 1e-9);
  });
});

describe('specific heat', () => {
  it('same energy warms iron about 9× more than the same mass of water', () => {
    const iron = new Body({ id: 'i', mat: 'iron', mass: 10, T: 20 });
    const water = new Body({ id: 'w', mat: 'water', mass: 10, T: 20 });
    iron.addHeat(100);
    water.addHeat(100);
    const dI = iron.T - 20;
    const dW = water.T - 20;
    close(dI / dW, 4.18 / 0.45, 1e-9);
  });
});

describe('mass transfer', () => {
  it('melt water moved between bodies conserves mass and energy', () => {
    const sys = new ThermalSystem();
    const door = sys.add({ id: 'door', mat: 'water', mass: 50, T: 0, phase: 'solid' });
    const pool = sys.add({ id: 'pool', mat: 'water', mass: 10, T: 4 });
    door.addHeat(334 * 20); // 20 kg melted
    const m0 = sys.totalMass('water');
    const e0 = sys.totalEnergy();
    const moved = transferMass(door, pool, 'liquid', 100);
    close(moved, 20, 1e-9);
    close(sys.totalMass('water'), m0, 1e-9);
    close(sys.totalEnergy(), e0, 1e-6);
    expect(door.state.frac.liquid).toBeCloseTo(0, 9);
    close(door.T, 0, 1e-9);
  });
});

describe('conduction', () => {
  it('heat flows hot → cold, conserves energy, and copper beats wood', () => {
    const run = (mat: 'copper' | 'wood') => {
      const sys = new ThermalSystem();
      sys.add({ id: 'hot', mat, mass: 1, T: 150 });
      sys.add({ id: 'cold', mat, mass: 1, T: 0 });
      const k = mat === 'copper' ? 400 : 0.15;
      sys.link('hot', 'cold', k * 0.01);
      const e0 = sys.totalEnergy();
      for (let i = 0; i < 60; i++) sys.conduct(1 / 60);
      close(sys.totalEnergy(), e0, 1e-6);
      expect(sys.get('hot').T).toBeGreaterThanOrEqual(sys.get('cold').T);
      return sys.get('cold').T;
    };
    expect(run('copper')).toBeGreaterThan(70);
    expect(run('wood')).toBeLessThan(1);
  });

  it('never overshoots: two bodies settle at the same temperature', () => {
    const sys = new ThermalSystem();
    sys.add({ id: 'a', mat: 'copper', mass: 0.1, T: 100 });
    sys.add({ id: 'b', mat: 'copper', mass: 0.1, T: 0 });
    sys.link('a', 'b', 1000);
    sys.conduct(1);
    close(sys.get('a').T, 50, 1e-3);
    close(sys.get('b').T, 50, 1e-3);
  });
});

describe('heat battery (gloves)', () => {
  it('cold glove stores the heat it pulls out; heat glove spends it — total conserved', () => {
    const sys = new ThermalSystem();
    const creek = sys.add({ id: 'creek', mat: 'water', mass: 10, T: 2 });
    const door = sys.add({ id: 'door', mat: 'water', mass: 10, T: -5 });
    const bat = new HeatBattery(1000, 10000);
    const total0 = sys.totalEnergy() + bat.energy;
    for (let i = 0; i < 600; i++) bat.apply(creek, 'cold', 500, 1 / 60);
    expect(creek.state.frac.solid).toBeGreaterThan(0.99);
    for (let i = 0; i < 600; i++) bat.apply(door, 'heat', 500, 1 / 60);
    close(sys.totalEnergy() + bat.energy, total0, 1e-6);
  });

  it('heat glove stops when the battery is empty; cold glove stops when it is full', () => {
    const b = new Body({ id: 'x', mat: 'water', mass: 100, T: -10 });
    const empty = new HeatBattery(50, 100);
    let moved = 0;
    for (let i = 0; i < 100; i++) moved += empty.apply(b, 'heat', 100, 0.1);
    close(moved, 50, 1e-9);
    expect(empty.energy).toBe(0);
    const full = new HeatBattery(90, 100);
    const w = new Body({ id: 'y', mat: 'water', mass: 100, T: 20 });
    let out = 0;
    for (let i = 0; i < 100; i++) out += full.apply(w, 'cold', 100, 0.1);
    close(out, -10, 1e-9);
    expect(full.energy).toBe(100);
  });

  it('gloves respect the body temperature limits', () => {
    const b = new Body({ id: 'x', mat: 'copper', mass: 1, T: 190, maxT: 200 });
    const bat = new HeatBattery(1000, 1000);
    for (let i = 0; i < 100; i++) bat.apply(b, 'heat', 100, 0.1);
    close(b.T, 200, 1e-9);
  });
});
