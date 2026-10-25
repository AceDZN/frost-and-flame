export interface V3 {
  x: number;
  y: number;
  z: number;
}

/** Axis-aligned box authored as centre-x, bottom-y, centre-z and size. */
export interface Box {
  x: number;
  y: number;
  z: number;
  w: number;
  h: number;
  d: number;
}

export interface AABB {
  minX: number;
  minY: number;
  minZ: number;
  maxX: number;
  maxY: number;
  maxZ: number;
}

export const v3 = (x = 0, y = 0, z = 0): V3 => ({ x, y, z });

export function toAABB(b: Box): AABB {
  return {
    minX: b.x - b.w / 2,
    maxX: b.x + b.w / 2,
    minY: b.y,
    maxY: b.y + b.h,
    minZ: b.z - b.d / 2,
    maxZ: b.z + b.d / 2,
  };
}

export function overlaps(a: AABB, b: AABB): boolean {
  return a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY && a.minZ < b.maxZ && a.maxZ > b.minZ;
}

export function dist(a: V3, b: V3): number {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

export function distXZ(a: V3, b: V3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

/** Segment p→q against a box (slab method). Returns hit fraction in [0,1] or null. */
export function segmentHitsAABB(p: V3, q: V3, b: AABB): number | null {
  let t0 = 0;
  let t1 = 1;
  const d = { x: q.x - p.x, y: q.y - p.y, z: q.z - p.z };
  for (const ax of ['x', 'y', 'z'] as const) {
    const min = ax === 'x' ? b.minX : ax === 'y' ? b.minY : b.minZ;
    const max = ax === 'x' ? b.maxX : ax === 'y' ? b.maxY : b.maxZ;
    if (Math.abs(d[ax]) < 1e-9) {
      if (p[ax] < min || p[ax] > max) return null;
      continue;
    }
    let ta = (min - p[ax]) / d[ax];
    let tb = (max - p[ax]) / d[ax];
    if (ta > tb) [ta, tb] = [tb, ta];
    t0 = Math.max(t0, ta);
    t1 = Math.min(t1, tb);
    if (t0 > t1) return null;
  }
  return t0;
}

export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
