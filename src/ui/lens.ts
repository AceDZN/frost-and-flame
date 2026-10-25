// The particle lens: shows the particle picture of a body — vibrating in a lattice
// (solid), sliding past each other (liquid), flying and filling the space (gas).
// Particle speed follows the absolute temperature, so particles never stop.
import type { Phase } from '../sim/materials';

interface Pt {
  x: number;
  y: number;
  vx: number;
  vy: number;
  hx: number;
  hy: number;
}

const COLORS: Record<string, [string, string]> = {
  water: ['#7fd4ff', '#1f7fd0'],
  dryIce: ['#f2f4f7', '#8c96a3'],
  copper: ['#ffc08a', '#c0612a'],
  iron: ['#d5dbe3', '#6a727c'],
  wood: ['#e0b483', '#8a5a33'],
  basalt: ['#9c9aa6', '#3c3a44'],
  air: ['#eaf6ff', '#9ab7cc'],
};

export interface LensInfo {
  mat: string;
  T: number;
  /** The phases to show (one, or two while changing: [from, to]). */
  phases: Phase[];
}

export class Lens {
  readonly canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private halves: { phase: Phase; pts: Pt[] }[] = [];
  private key = '';
  private size = 360;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = this.canvas.height = this.size * 2;
    this.ctx = this.canvas.getContext('2d')!;
  }

  private build(info: LensInfo) {
    const S = this.size * 2;
    const two = info.phases.length === 2;
    this.halves = info.phases.map((phase, i) => {
      // RTL: the first phase (the one being used up) sits on the right
      const x0 = two ? (i === 0 ? S / 2 : 0) : 0;
      const x1 = two ? (i === 0 ? S : S / 2) : S;
      const pts: Pt[] = [];
      if (phase === 'solid') {
        // ice is the less dense phase of water, so its lattice is drawn a little more open
        const step = info.mat === 'water' ? 104 : 92;
        for (let y = step / 2; y < S; y += step)
          for (let x = x0 + step / 2; x < x1; x += step) pts.push({ x, y, vx: 0, vy: 0, hx: x, hy: y });
      } else if (phase === 'liquid') {
        const n = two ? 26 : 50;
        for (let k = 0; k < n; k++) {
          const x = x0 + 40 + Math.random() * (x1 - x0 - 80);
          const y = 40 + Math.random() * (S - 80);
          pts.push({ x, y, vx: (Math.random() - 0.5) * 60, vy: (Math.random() - 0.5) * 60, hx: x, hy: y });
        }
      } else {
        const n = two ? 6 : 10;
        for (let k = 0; k < n; k++) {
          const x = x0 + 40 + Math.random() * (x1 - x0 - 80);
          const y = 40 + Math.random() * (S - 80);
          const a = Math.random() * Math.PI * 2;
          pts.push({ x, y, vx: Math.cos(a), vy: Math.sin(a), hx: x0, hy: x1 });
        }
      }
      return { phase, pts };
    });
  }

  draw(info: LensInfo, dt: number) {
    const key = `${info.mat}:${info.phases.join('>')}`;
    if (key !== this.key) {
      this.key = key;
      this.build(info);
    }
    const S = this.size * 2;
    const ctx = this.ctx;
    const kelvin = Math.max(30, info.T + 273);
    const speed = Math.sqrt(kelvin / 273); // ∝ typical particle speed
    const [light, dark] = COLORS[info.mat] ?? COLORS.water;
    const g = ctx.createRadialGradient(S / 2, S / 2, 0, S / 2, S / 2, S / 2);
    g.addColorStop(0, info.T > 60 ? '#3a2430' : '#0f3a5c');
    g.addColorStop(1, '#06121f');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, S, S);
    const R = 30;
    for (const h of this.halves) {
      const two = this.halves.length === 2;
      const x0 = two ? (h === this.halves[0] ? S / 2 : 0) : 0;
      const x1 = two ? (h === this.halves[0] ? S : S / 2) : S;
      if (h.phase === 'solid') {
        const amp = 4 + speed * 9;
        ctx.strokeStyle = 'rgba(120,200,255,0.45)';
        ctx.lineWidth = 4;
        for (const p of h.pts) {
          p.x = p.hx + (Math.random() - 0.5) * amp;
          p.y = p.hy + (Math.random() - 0.5) * amp;
        }
        // bonds to right and down neighbours
        for (const p of h.pts)
          for (const q of h.pts) {
            const dx = q.hx - p.hx;
            const dy = q.hy - p.hy;
            if ((dx > 1 && dx < 115 && Math.abs(dy) < 1) || (dy > 1 && dy < 115 && Math.abs(dx) < 1)) {
              ctx.beginPath();
              ctx.moveTo(p.x, p.y);
              ctx.lineTo(q.x, q.y);
              ctx.stroke();
            }
          }
      } else if (h.phase === 'liquid') {
        const v = 70 * speed;
        for (const p of h.pts) {
          p.vx += (Math.random() - 0.5) * v * 4 * dt;
          p.vy += (Math.random() - 0.5) * v * 4 * dt;
          const m = Math.hypot(p.vx, p.vy) || 1;
          if (m > v) {
            p.vx *= v / m;
            p.vy *= v / m;
          }
        }
        // soft repulsion keeps them close but not overlapping
        for (let i = 0; i < h.pts.length; i++)
          for (let j = i + 1; j < h.pts.length; j++) {
            const a = h.pts[i];
            const b = h.pts[j];
            const dx = b.x - a.x;
            const dy = b.y - a.y;
            const d = Math.hypot(dx, dy) || 1;
            if (d < 2 * R + 6) {
              const push = ((2 * R + 6 - d) / d) * 0.5;
              a.x -= dx * push;
              a.y -= dy * push;
              b.x += dx * push;
              b.y += dy * push;
            }
          }
        for (const p of h.pts) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.y += 40 * dt; // liquids settle down
          this.contain(p, x0, x1, S, R);
        }
      } else {
        const v = 380 * speed;
        for (const p of h.pts) {
          p.x += p.vx * v * dt;
          p.y += p.vy * v * dt;
          if (p.x < x0 + R || p.x > x1 - R) p.vx *= -1;
          if (p.y < R || p.y > S - R) p.vy *= -1;
          this.contain(p, x0, x1, S, R);
          // motion trail
          ctx.strokeStyle = 'rgba(200,240,255,0.25)';
          ctx.lineWidth = 10;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 60, p.y - p.vy * 60);
          ctx.stroke();
        }
      }
      for (const p of h.pts) {
        const pg = ctx.createRadialGradient(p.x - 9, p.y - 9, 2, p.x, p.y, R);
        pg.addColorStop(0, light);
        pg.addColorStop(1, dark);
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    if (this.halves.length === 2) {
      ctx.fillStyle = '#d6aa52';
      ctx.fillRect(S / 2 - 5, 0, 10, S);
    }
  }

  private contain(p: Pt, x0: number, x1: number, S: number, R: number) {
    p.x = Math.min(x1 - R, Math.max(x0 + R, p.x));
    p.y = Math.min(S - R, Math.max(R, p.y));
  }
}
