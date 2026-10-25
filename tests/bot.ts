// A test bot that plays levels only through the same Input the player uses.
import { Game, NO_INPUT, type Input } from '../src/game/game';
import { LEVELS } from '../src/game/levels';

export const DT = 1 / 60;

export class Bot {
  g: Game;
  constructor(levelId: string) {
    const def = LEVELS.find((l) => l.id === levelId)!;
    this.g = new Game(def);
  }

  step(inp: Partial<Input> = {}, n = 1) {
    for (let i = 0; i < n; i++) this.g.step(DT, { ...NO_INPUT, ...inp });
  }

  wait(sec: number) {
    this.step({}, Math.round(sec / DT));
  }

  /** Walk straight toward (x,z). `jump` presses jump when close to `jumpAt` distance. */
  goto(x: number, z: number, opts: { maxT?: number; tol?: number; jumpWhenBlocked?: boolean; jumpHold?: boolean } = {}): boolean {
    const tol = opts.tol ?? 0.3;
    const steps = Math.round((opts.maxT ?? 12) / DT);
    let stuck = 0;
    let last = { ...this.g.player.pos };
    for (let i = 0; i < steps; i++) {
      const p = this.g.player.pos;
      const dx = x - p.x;
      const dz = z - p.z;
      const d = Math.hypot(dx, dz);
      if (d < tol) {
        this.step({}, 10);
        return true;
      }
      const moved = Math.hypot(p.x - last.x, p.z - last.z);
      stuck = moved < 0.01 ? stuck + 1 : 0;
      last = { ...p };
      const jump = !!opts.jumpHold || (!!opts.jumpWhenBlocked && stuck > 3 && i % 30 < 20);
      this.step({ mx: dx / Math.max(d, 1), mz: dz / Math.max(d, 1), jump });
      if (this.g.won) return true;
    }
    return false;
  }

  /** Face a point by taking one tiny step toward it. */
  face(x: number, z: number) {
    const p = this.g.player.pos;
    const dx = x - p.x;
    const dz = z - p.z;
    const d = Math.hypot(dx, dz) || 1;
    this.g.player.yaw = Math.atan2(dx / d, -dz / d);
    this.step({}, 2);
  }

  /** Hold a glove until cond or timeout. Returns seconds held. */
  hold(mode: 'heat' | 'cold', until: (g: Game) => boolean, maxT = 20, extra: Partial<Input> = {}): number {
    const steps = Math.round(maxT / DT);
    for (let i = 0; i < steps; i++) {
      if (until(this.g)) {
        this.step({}, 2);
        return i * DT;
      }
      this.step({ [mode]: true, ...extra });
    }
    this.step({}, 2);
    return maxT;
  }

  /** Jump toward a point (hold forward). */
  jumpToward(x: number, z: number, sec = 1.2) {
    const steps = Math.round(sec / DT);
    for (let i = 0; i < steps; i++) {
      const p = this.g.player.pos;
      const dx = x - p.x;
      const dz = z - p.z;
      const d = Math.hypot(dx, dz) || 1;
      this.step({ mx: d > 0.2 ? dx / d : 0, mz: d > 0.2 ? dz / d : 0, jump: i < 8 });
    }
  }
}
