import { describe, expect, it } from 'vitest';
import { Bot } from './bot';
import { LEVELS } from '../src/game/levels';
import { Game } from '../src/game/game';

const MJ = 1000;

function waterMass(g: Game) {
  return g.sys.totalMass('water');
}

describe('level 1 — Thaw', () => {
  it('melt the door, freeze the creek, reach the exit', () => {
    const b = new Bot('thaw');
    const m0 = waterMass(b.g);
    expect(b.goto(0, 2.6)).toBe(true);
    b.face(0, 1.6);
    b.hold('heat', (g) => g.solidLeft('door') < 0.05);
    expect(b.g.solidLeft('door')).toBeLessThan(0.05);
    // the melt water went somewhere: mass is conserved
    expect(waterMass(b.g)).toBeCloseTo(m0, 6);
    expect(b.goto(0, -1.6)).toBe(true);
    b.face(0, -4);
    const batteryBefore = b.g.battery.energy;
    b.hold('cold', (g) => g.body('creek').state.frac.solid >= 0.99);
    // freezing released heat into the battery (≈ m·L)
    expect(b.g.battery.energy - batteryBefore).toBeGreaterThan(756 * 334 * 0.95);
    expect(b.goto(0, -10, { maxT: 8 })).toBe(true);
    expect(b.g.won).toBe(true);
    expect(b.g.splashes).toBe(0);
    expect(b.g.stars()).toBe(3);
    expect(waterMass(b.g)).toBeCloseTo(m0, 6);
  });

  it('the door temperature sticks at 0 °C while it melts', () => {
    const b = new Bot('thaw');
    b.goto(0, 2.6);
    b.face(0, 1.6);
    const temps: number[] = [];
    b.hold('heat', (g) => {
      temps.push(g.body('door').T);
      return g.solidLeft('door') < 0.2;
    });
    const atZero = temps.filter((t) => Math.abs(t) < 1e-6).length;
    expect(atZero / temps.length).toBeGreaterThan(0.8);
  });

  it('walking into the unfrozen creek is a splash and a respawn, not a dead end', () => {
    const b = new Bot('thaw');
    b.goto(0, 2.6);
    b.face(0, 1.6);
    b.hold('heat', (g) => g.solidLeft('door') < 0.05);
    b.goto(0, -4, { maxT: 1.6 });
    expect(b.g.splashes).toBe(1);
    b.wait(1.5);
    expect(b.g.player.pos.z).toBeGreaterThan(-2.2);
    expect(b.g.won).toBe(false);
  });

  it('heating the creek does not make a bridge', () => {
    const b = new Bot('thaw');
    b.goto(0, 2.6);
    b.face(0, 1.6);
    b.hold('heat', (g) => g.solidLeft('door') < 0.05);
    b.goto(0, -1.6);
    b.face(0, -4);
    b.hold('heat', () => false, 3);
    expect(b.g.body('creek').state.frac.solid).toBe(0);
    expect(b.g.body('creek').T).toBeGreaterThan(1);
  });
});

describe('level 2 — Steam Lift', () => {
  const solve = (b: Bot) => {
    expect(b.goto(0.8, -2.8)).toBe(true);
    expect(b.g.player.groundId).toBe('balloon');
    b.face(-2.2, -2.6);
    b.hold('heat', (g) => g.balloonTop(g.entity<'balloon'>('balloon')) >= 4.49, 15);
    expect(b.g.player.pos.y).toBeGreaterThan(4.4);
    expect(b.goto(-1.6, -5.2)).toBe(true);
    b.face(-1.6, -6);
    b.hold('cold', (g) => g.body('tank').mass >= 149.9, 15);
  };

  it('boil → ride the balloon → condense → the tank refills to the same mass → gate opens', () => {
    const b = new Bot('steam');
    const m0 = waterMass(b.g);
    solve(b);
    expect(b.g.body('tank').mass).toBeCloseTo(150, 1);
    expect(waterMass(b.g)).toBeCloseTo(m0, 6);
    expect(b.goto(0, -11.3, { maxT: 8 })).toBe(true);
    expect(b.g.won).toBe(true);
  });

  it('the basin passes through two plateaus: 0 °C and 100 °C', () => {
    const b = new Bot('steam');
    b.goto(0.8, -2.8);
    b.face(-2.2, -2.6);
    const seen = new Set<string>();
    b.hold('heat', (g) => {
      const c = g.body('basin').state.changing;
      if (c) seen.add(`${c.from}>${c.to}@${g.body('basin').T}`);
      return g.balloonTop(g.entity<'balloon'>('balloon')) >= 4.49;
    }, 15);
    expect([...seen]).toEqual(['solid>liquid@0', 'liquid>gas@100']);
  });

  it('heating the condenser instead does not refill the tank', () => {
    const b = new Bot('steam');
    b.goto(0.8, -2.8);
    b.face(-2.2, -2.6);
    b.hold('heat', (g) => g.balloonTop(g.entity<'balloon'>('balloon')) >= 4.49, 15);
    b.goto(-1.6, -5.2);
    b.face(-1.6, -6);
    b.hold('heat', () => false, 2);
    // (a little steam condensed on the cold plate before it warmed up)
    expect(b.g.body('tank').mass).toBeLessThan(2);
    expect(b.g.latched.has('gate')).toBe(false);
  });

  it('boiling without riding is recoverable: cooling the balloon brings it back down', () => {
    const b = new Bot('steam');
    b.goto(-0.9, -1.6);
    b.face(-2.2, -2.6);
    b.hold('heat', (g) => g.balloonTop(g.entity<'balloon'>('balloon')) >= 4.49, 15);
    expect(b.g.visibleHint?.glyph).toBe('cold');
    b.face(0.8, -3.2);
    b.hold('cold', (g) => g.body('balloon').massOf('gas') < 1, 15);
    expect(b.g.body('basin').mass).toBeGreaterThan(148);
    solve(b);
    expect(b.g.body('tank').mass).toBeGreaterThan(145);
  });
});

describe('level 3 — Heat Paths', () => {
  it('copper conducts, the dark stone absorbs sunlight, warm air lifts the glider', () => {
    const b = new Bot('paths');
    expect(b.goto(-2.0, 2.2)).toBe(true);
    b.face(-2.0, 1.3);
    b.hold('heat', (g) => g.solidLeft('lock') < 0.1, 20);
    expect(b.g.solidLeft('lock')).toBeLessThan(0.12);
    b.wait(1);
    expect(b.goto(0, -3)).toBe(true);
    expect(b.goto(1.5, -6.5)).toBe(true);
    b.wait(0.5);
    expect(b.g.mirrorAim.get('mirror')).toBe(1);
    b.wait(12);
    expect(b.g.solidLeft('latch')).toBeLessThan(0.12);
    b.wait(1);
    expect(b.goto(0, -12.5)).toBe(true);
    b.face(0, -14.5);
    b.hold('heat', (g) => g.body('vent').T > 140, 10);
    expect(b.goto(0, -14.5)).toBe(true);
    // jump and hold in the warm column, then drift onto the ledge
    for (let i = 0; i < 240 && b.g.player.pos.y < 6; i++) b.step({ jump: true });
    expect(b.g.player.pos.y).toBeGreaterThan(5.5);
    expect(b.goto(0, -19.3, { maxT: 6, jumpHold: true })).toBe(true);
    expect(b.g.won).toBe(true);
  });

  it('heating the wooden rod barely warms its far end (and the lock stays frozen)', () => {
    const b = new Bot('paths');
    b.goto(2.0, 2.2);
    b.face(2.0, 1.3);
    b.hold('heat', () => false, 8);
    const near = b.g.body('woodRod#0').T;
    const far = b.g.body('woodRod#4').T;
    expect(near).toBeGreaterThan(150);
    expect(far).toBeLessThan(-7);
    expect(b.g.solidLeft('lock')).toBeGreaterThan(0.99);
  });

  it('the glass blocks the glove aimed at the lock', () => {
    const b = new Bot('paths');
    b.goto(0, 0.6);
    b.face(0, -0.75);
    b.step({ heat: true }, 30);
    expect(b.g.target).toBe('lock');
    expect(b.g.gloveBlocked).not.toBe(null);
    expect(b.g.solidLeft('lock')).toBe(1);
  });

  it('sunlight on the white snow latch never melts it', () => {
    const b = new Bot('paths');
    b.goto(-2.0, 2.2);
    b.face(-2.0, 1.3);
    b.hold('heat', (g) => g.solidLeft('lock') < 0.1, 20);
    b.wait(1);
    b.goto(0, -3);
    b.goto(-1.5, -6.5);
    b.wait(30);
    expect(b.g.mirrorAim.get('mirror')).toBe(0);
    expect(b.g.solidLeft('latch')).toBe(1);
    expect(b.g.body('latch').T).toBeLessThan(0);
  });

  it('jumping from the cold vent cannot reach the ledge', () => {
    const b = new Bot('paths');
    b.goto(-2.0, 2.2);
    b.face(-2.0, 1.3);
    b.hold('heat', (g) => g.solidLeft('lock') < 0.1, 20);
    b.wait(1);
    b.goto(0, -3);
    b.goto(1.5, -6.5);
    b.wait(12);
    b.goto(0, -14.5);
    for (let i = 0; i < 120; i++) b.step({ jump: true });
    expect(b.g.player.pos.y).toBeLessThan(1.6);
  });
});

describe('level 4 — Squeeze', () => {
  const pastDryIce = (b: Bot) => {
    b.goto(0, 1.2);
    b.face(0, 0);
    b.hold('heat', (g) => g.solidLeft('dry') < 0.05, 10);
    // no liquid ever: the CO₂ went straight to gas
    expect(b.g.body('co2air').mass).toBeGreaterThan(400);
    b.wait(0.5);
    expect(b.goto(0, -2)).toBe(true);
  };

  it('dry ice sublimates; the air plunger squishes; melt the ice pipe and the push opens the gate', () => {
    const b = new Bot('squeeze');
    pastDryIce(b);
    expect(b.goto(-2, -3.6)).toBe(true);
    b.wait(1);
    expect(b.g.plungerResult(b.g.entity<'plunger'>('plA'))).toBe('squish');
    expect(b.g.gateOpen.get('gate')!).toBeLessThan(0.2);
    expect(b.goto(2, -3.6)).toBe(true);
    b.wait(0.5);
    expect(b.g.plungerResult(b.g.entity<'plunger'>('plB'))).toBe('locked');
    expect(b.g.gateOpen.get('gate')!).toBeLessThan(0.05);
    b.goto(2, -4.72, { tol: 0.06 });
    b.face(2, -5.2);
    b.hold('heat', (g) => g.body('waterpipe').state.frac.liquid > 0.99, 10);
    expect(b.goto(2, -3.6)).toBe(true);
    b.wait(1);
    expect(b.g.latched.has('gate')).toBe(true);
    expect(b.goto(0, -14, { maxT: 8 })).toBe(true);
    expect(b.g.won).toBe(true);
  });

  it('freezing the water pipe again locks it', () => {
    const b = new Bot('squeeze');
    pastDryIce(b);
    b.goto(2, -4.72, { tol: 0.06 });
    b.face(2, -5.2);
    b.hold('heat', (g) => g.body('waterpipe').state.frac.liquid > 0.99, 10);
    b.face(2, -5.2);
    b.hold('cold', (g) => g.body('waterpipe').state.frac.solid > 0.9, 10);
    b.goto(2, -3.6);
    b.wait(1);
    expect(b.g.plungerResult(b.g.entity<'plunger'>('plB'))).toBe('locked');
    expect(b.g.latched.has('gate')).toBe(false);
  });
});

describe('level 5 — Plateau', () => {
  it('the big ice lift sticks at 0 °C and the battery runs out before it reaches the ledge', () => {
    const b = new Bot('plateau');
    expect(b.goto(-2.2, -3.7)).toBe(true);
    expect(b.g.player.groundId).toBe('liftBig');
    const heldAtZero: number[] = [];
    b.hold('heat', (g) => {
      if (g.body('iceBig').T === 0) heldAtZero.push(g.t);
      return g.battery.energy <= 0;
    }, 15);
    expect(heldAtZero.length).toBeGreaterThan(60);
    expect(b.g.body('iceBig').T).toBe(0);
    // jumping from the stuck lift can't reach the ledge
    b.jumpToward(-2.2, -6);
    expect(b.g.player.pos.y).toBeLessThan(3.3);
  });

  it('…but cooling it gives the energy back (energy is conserved), then the small lift works', () => {
    const b = new Bot('plateau');
    b.goto(-2.2, -3.7);
    b.hold('heat', (g) => g.battery.energy <= 0, 15);
    b.hold('cold', (g) => g.body('iceBig').state.frac.liquid === 0 && g.body('iceBig').T <= -10, 15);
    expect(b.g.battery.energy).toBeGreaterThan(199_000);
    b.goto(-2.2, -2.2);
    b.goto(2.2, -2.2);
    expect(b.goto(2.2, -3.7)).toBe(true);
    expect(b.g.player.groundId).toBe('liftSmall');
    b.hold('heat', (g) => g.body('iceSmall').T >= 26, 10);
    b.jumpToward(2.2, -6);
    expect(b.g.player.pos.y).toBeGreaterThan(3.3);
  });

  const toLedge1 = (b: Bot) => {
    b.goto(2.2, -3.7);
    b.hold('heat', (g) => g.body('iceSmall').T >= 26, 10);
    b.jumpToward(2.2, -6);
    expect(b.g.player.pos.y).toBeGreaterThan(3.3);
  };

  it('same mass, same heat: iron rises far faster than water; iron reaches the top', () => {
    const b = new Bot('plateau');
    toLedge1(b);
    expect(b.goto(2.2, -9.75)).toBe(true);
    expect(b.g.player.groundId).toBe('liftIron');
    const e0 = b.g.battery.energy;
    b.hold('heat', (g) => g.body('ironTank').T >= 75, 10);
    expect(e0 - b.g.battery.energy).toBeLessThan(45 * MJ);
    b.jumpToward(2.2, -12.5);
    expect(b.g.player.pos.y).toBeGreaterThan(7.6);
    expect(b.goto(0, -15, { maxT: 6 })).toBe(true);
    expect(b.g.won).toBe(true);
  });

  it('the water lift cannot get there on the battery', () => {
    const b = new Bot('plateau');
    toLedge1(b);
    b.goto(-2.2, -9.75);
    expect(b.g.player.groundId).toBe('liftWater');
    b.hold('heat', (g) => g.battery.energy <= 0, 20);
    expect(b.g.body('waterTank').T).toBeLessThan(70);
    b.jumpToward(-2.2, -12.5);
    expect(b.g.player.pos.y).toBeLessThan(7.6);
  });
});

describe('level 6 — The Observatory (transfer)', () => {
  const freezeFountain = (b: Bot) => {
    b.goto(-3.5, 6.4);
    b.face(-3.5, 8);
    b.hold('cold', (g) => g.body('fountain').state.frac.solid >= 0.99, 10);
  };
  const meltPlug = (b: Bot) => {
    b.goto(3.6, 5.3);
    b.face(3.6, 4);
    b.hold('heat', (g) => g.solidLeft('plug') < 0.05, 10);
    b.wait(0.3);
  };

  it('is solvable without hints: fountain → plug → creek → boil → copper rod → iron lift', () => {
    const b = new Bot('observatory');
    expect(b.g.visibleHint).toBe(null);
    freezeFountain(b);
    meltPlug(b);
    expect(b.goto(3.6, 2.6)).toBe(true);
    expect(b.goto(0, 0.6)).toBe(true);
    b.face(0, -2.6);
    b.hold('cold', (g) => g.body('creek').state.frac.solid >= 0.99, 10);
    expect(b.goto(0, -6)).toBe(true);
    expect(b.goto(0.8, -11.2)).toBe(true);
    expect(b.g.player.groundId).toBe('balloon');
    b.face(-2.4, -8.6);
    b.hold('heat', (g) => g.balloonTop(g.entity<'balloon'>('balloon')) >= 4.49, 15);
    expect(b.goto(0.8, -13.2)).toBe(true);
    expect(b.goto(2.0, -12.9)).toBe(true);
    b.face(2.0, -13.7);
    b.hold('heat', (g) => g.solidLeft('latch') < 0.1, 20);
    b.wait(1);
    expect(b.goto(0, -16.4)).toBe(true);
    expect(b.goto(-1.8, -18.2)).toBe(true);
    expect(b.g.player.groundId).toBe('liftIron');
    b.hold('heat', (g) => g.body('ironTank').T >= 72, 10);
    b.jumpToward(-1.8, -20.6);
    expect(b.g.player.pos.y).toBeGreaterThan(9.4);
    expect(b.goto(0, -20.6, { maxT: 5 })).toBe(true);
    expect(b.g.won).toBe(true);
    expect(b.g.hintsShown.size).toBe(0);
  });

  it('"heat everything" fails: pouring heat into the glacier empties the battery', () => {
    const b = new Bot('observatory');
    b.goto(0, 5.4);
    b.face(0, 4);
    b.hold('heat', (g) => g.battery.energy <= 0, 30);
    // all of it only warmed the huge block a little — not one gram melted
    expect(b.g.solidLeft('glacier')).toBe(1);
    expect(b.g.body('glacier').T).toBeGreaterThan(-12);
    b.goto(3.6, 5.3);
    b.face(3.6, 4);
    b.hold('heat', () => false, 2);
    expect(b.g.solidLeft('plug')).toBe(1);
  });

  it('the plug cannot be melted on the starting battery alone', () => {
    const b = new Bot('observatory');
    meltPlug(b);
    expect(b.g.solidLeft('plug')).toBeGreaterThan(0.12);
  });
});

describe('every level', () => {
  it.each(LEVELS.map((l) => [l.id]))('%s conserves water mass over a minute of random play', (id) => {
    const b = new Bot(id);
    const m0 = waterMass(b.g);
    let seed = 7;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 60 * 60; i++) {
      b.g.step(1 / 60, { mx: rnd() * 2 - 1, mz: rnd() * 2 - 1, jump: rnd() < 0.05, heat: rnd() < 0.4, cold: rnd() > 0.7, lens: false });
    }
    expect(waterMass(b.g)).toBeCloseTo(m0, 5);
  });
});

describe('regressions', () => {
  it('the cold glove cannot farm energy from things already at air temperature (L6 glacier)', () => {
    const b = new Bot('observatory');
    b.goto(0, 5.4);
    b.face(0, 4);
    const e0 = b.g.battery.energy;
    b.hold('cold', () => false, 3);
    expect(b.g.battery.energy).toBeCloseTo(e0, 3);
    expect(b.g.body('glacier').T).toBeCloseTo(-12, 6);
  });

  it('a heat glove that boils the basin dry does not jump to heating the balloon', () => {
    const b = new Bot('steam');
    b.goto(0.8, -2.8);
    b.face(-2.2, -2.6);
    b.hold('heat', () => false, 8);
    expect(b.g.body('basin').mass).toBe(0);
    expect(b.g.body('balloon').T).toBeLessThan(101); // not heated on toward 200 °C
  });
});
