import * as THREE from 'three';
import type { Game } from '../game/game';
import type { EntityDef, StaticBox } from '../game/types';
import { clamp } from '../game/geom';
import type { World } from './world';
import { Particles } from './vfx';
import { glowSprite, iceCrackTexture, iceTexture, labelTexture, puffSprite, waterNormalTexture } from './textures';
import type { Models } from './models';

const tmp = new THREE.Vector3();
const tmp2 = new THREE.Vector3();

function noise3(x: number, y: number, z: number) {
  return Math.sin(x * 3.1 + y * 1.7) * 0.5 + Math.sin(z * 2.3 - x * 1.3 + y * 2.9) * 0.35 + Math.sin(y * 5.1 + z * 4.2) * 0.15;
}

/** A box whose sides are lumpy rock but whose top stays flat (the collider is the box). */
function rockGeometry(w: number, h: number, d: number, amp = 0.12): THREE.BufferGeometry {
  const sx = Math.min(14, Math.max(1, Math.round(w * 1.5)));
  const sy = Math.min(10, Math.max(1, Math.round(h * 1.5)));
  const sz = Math.min(14, Math.max(1, Math.round(d * 1.5)));
  const g = new THREE.BoxGeometry(w, h, d, sx, sy, sz);
  const p = g.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    const z = p.getZ(i);
    if (y > h / 2 - 1e-3) continue;
    const n = noise3(x, y, z) * amp;
    const ex = Math.abs(Math.abs(x) - w / 2) < 1e-3 ? Math.sign(x) : 0;
    const ez = Math.abs(Math.abs(z) - d / 2) < 1e-3 ? Math.sign(z) : 0;
    p.setXYZ(i, x + ex * n, y, z + ez * n);
  }
  g.computeVertexNormals();
  return g;
}

/** Tile a box's texture by its size instead of stretching one copy over each face. */
function tileUV(g: THREE.BufferGeometry, k: number) {
  const uv = g.attributes.uv as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * k, uv.getY(i) * k);
  return g;
}

/** Thin cylinder between two points (pipes, ropes, beams). */
export function stretch(mesh: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3) {
  const len = a.distanceTo(b);
  mesh.position.copy(a).add(b).multiplyScalar(0.5);
  mesh.scale.set(1, Math.max(1e-3, len), 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tmp2.copy(b).sub(a).normalize());
}

interface Updater {
  (g: Game, dt: number, t: number): void;
}

function tempColor(T: number, base: THREE.Color, out: THREE.Color) {
  // cold → frosty blue tint, hot → red/orange glow
  out.copy(base);
  if (T < -5) out.lerp(new THREE.Color(0xcfe8ff), clamp((-5 - T) / 30, 0, 0.5));
  return out;
}

function glowFor(T: number, out: THREE.Color) {
  const k = clamp((T - 80) / 220, 0, 1);
  out.setRGB(1.0 * k, 0.32 * k * k, 0.05 * k);
  return out;
}

export class LevelView {
  readonly root = new THREE.Group();
  private updaters: Updater[] = [];
  sparks: Particles;
  puffs: Particles;
  drops: Particles;
  private exitLight: THREE.PointLight | null = null;
  private waterNormal = waterNormalTexture();
  private crack = iceCrackTexture();
  private iceTex = iceTexture();
  readonly anchors = new Map<string, THREE.Object3D>();
  /** Meshes the camera must not hide behind. */
  readonly occluders: THREE.Object3D[] = [];

  constructor(
    private world: World,
    private game: Game,
    private models: Models,
  ) {
    this.sparks = new Particles(1400, glowSprite('#ffffff'), true);
    this.puffs = new Particles(700, puffSprite(), false);
    this.drops = new Particles(600, glowSprite('#cfefff'), false);
    this.root.add(this.sparks.points, this.puffs.points, this.drops.points);
    for (const s of game.def.statics) this.addStatic(s);
    for (const e of game.def.entities) this.addEntity(e);
    this.addExit();
    this.addDecor();
  }

  setViewport(h: number) {
    this.sparks.setViewport(h);
    this.puffs.setViewport(h);
    this.drops.setViewport(h);
  }

  dispose() {
    this.root.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
    });
  }

  // ------------------------------------------------------------- statics

  private addStatic(s: StaticBox) {
    const M = this.world.mats;
    if (s.style === 'glass') {
      const g = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), M.glass);
      g.position.set(s.x, s.y + s.h / 2, s.z);
      g.renderOrder = 3;
      this.root.add(g);
      const frame = new THREE.Group();
      const bar = (w: number, h: number, x: number, y: number) => {
        const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, s.d + 0.06), M.brass);
        b.position.set(x, y, 0);
        b.castShadow = true;
        frame.add(b);
      };
      bar(s.w, 0.08, 0, s.h / 2);
      bar(s.w, 0.08, 0, -s.h / 2);
      bar(0.08, s.h, -s.w / 2, 0);
      bar(0.08, s.h, s.w / 2, 0);
      if (s.w > 2) for (let x = -s.w / 2 + 1.2; x < s.w / 2 - 0.4; x += 1.2) bar(0.05, s.h, x, 0);
      frame.position.copy(g.position);
      this.root.add(frame);
      return;
    }
    if (s.style === 'brass') {
      const b = new THREE.Mesh(new THREE.BoxGeometry(s.w, s.h, s.d), M.brass);
      b.position.set(s.x, s.y + s.h / 2, s.z);
      b.castShadow = b.receiveShadow = true;
      this.root.add(b);
      return;
    }
    if (s.visualH !== undefined) s = { ...s, h: s.visualH };
    const big = s.w * s.d > 6 || s.h > 2;
    const mat = s.style === 'stone' ? M.stone : M.basalt;
    const geo = tileUV(rockGeometry(s.w, s.h, s.d, s.style === 'stone' ? 0.03 : big ? 0.16 : 0.06), Math.max(1, Math.max(s.w, s.h, s.d) / 2.5));
    const m = new THREE.Mesh(geo, mat);
    m.position.set(s.x, s.y + s.h / 2, s.z);
    if (s.y + s.h > 0.8) this.occluders.push(m);
    m.castShadow = s.h < 6;
    m.receiveShadow = true;
    this.root.add(m);
    if (s.style === 'snow' || (s.style === 'basalt' && s.w * s.d > 0.5)) {
      const cap = new THREE.Mesh(tileUV(new THREE.BoxGeometry(s.w + 0.04, 0.12, s.d + 0.04), Math.max(1, Math.max(s.w, s.d) / 3)), M.snow);
      cap.position.set(s.x, s.y + s.h + 0.04, s.z);
      cap.receiveShadow = true;
      this.root.add(cap);
    }
  }

  // ------------------------------------------------------------- entities

  private anchorObj(id: string) {
    const o = new THREE.Object3D();
    this.anchors.set(id, o);
    this.root.add(o);
    return o;
  }

  private iceMaterial(tint: string | undefined) {
    const color = tint === 'white' ? 0xf4f8ff : tint === 'dark' ? 0x5b6a80 : tint === 'dry' ? 0xeef3f6 : 0xa8dcff;
    return new THREE.MeshPhysicalMaterial({
      color,
      map: tint === 'white' || tint === 'dry' ? null : this.iceTex,
      roughness: tint === 'white' || tint === 'dry' ? 0.85 : 0.08,
      metalness: 0,
      transparent: tint !== 'white' && tint !== 'dry',
      opacity: tint === 'clear' ? 0.62 : 0.86,
      clearcoat: tint === 'white' || tint === 'dry' ? 0 : 1,
      emissive: tint === 'dry' ? 0x223344 : 0x2b6c9a,
      emissiveMap: this.crack,
      emissiveIntensity: 0.25,
    });
  }

  private addEntity(e: EntityDef) {
    const g = this.game;
    const M = this.world.mats;
    switch (e.kind) {
      case 'ice': {
        const mat = this.iceMaterial(e.tint);
        const mesh = new THREE.Mesh(rockGeometry(e.box.w, 1, e.box.d, 0.04), mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.root.add(mesh);
        // icicles along the bottom edge for clear ice
        const icicles = new THREE.Group();
        if (e.tint === 'clear' && e.box.h > 1.5) {
          for (let i = 0; i < 7; i++) {
            const c = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.35 + Math.random() * 0.3, 6), mat);
            c.rotation.x = Math.PI;
            c.position.set(-e.box.w / 2 + 0.15 + (i / 6) * (e.box.w - 0.3), 0, -e.box.d / 2 - 0.02);
            icicles.add(c);
          }
          this.root.add(icicles);
        }
        if (e.box.h > 1.4 && e.tint !== 'dry') {
          // a brass frame makes a wall of ice read as a door
          const fr = new THREE.Group();
          const post = (x: number) => {
            const m = new THREE.Mesh(new THREE.BoxGeometry(0.16, e.box.h + 0.1, e.box.d + 0.2), M.brass);
            m.position.set(x, e.box.h / 2, 0);
            m.castShadow = true;
            fr.add(m);
          };
          post(-e.box.w / 2 - 0.08);
          post(e.box.w / 2 + 0.08);
          const top = new THREE.Mesh(new THREE.BoxGeometry(e.box.w + 0.32, 0.16, e.box.d + 0.2), M.brass);
          top.position.y = e.box.h + 0.05;
          fr.add(top);
          for (const x of [-e.box.w / 2 - 0.08, e.box.w / 2 + 0.08]) {
            const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xffd38a, emissive: 0xffa040, emissiveIntensity: 3 }));
            lamp.position.set(x, e.box.h + 0.25, e.box.d / 2 + 0.12);
            fr.add(lamp);
          }
          fr.position.set(e.box.x, e.box.y, e.box.z);
          this.root.add(fr);
        }
        const a = this.anchorObj(e.id);
        let prevF = 1;
        this.updaters.push((game, dt, t) => {
          const f = game.solidLeft(e.body);
          const st = game.body(e.body).state;
          mesh.visible = f > 0.02;
          const h = Math.max(0.02, e.box.h * f);
          mesh.scale.set(1 - (1 - f) * 0.15, h, 1 - (1 - f) * 0.25);
          mesh.position.set(e.box.x, e.box.y + h / 2, e.box.z);
          icicles.position.set(e.box.x, e.box.y + h - 0.05, e.box.z);
          icicles.visible = f > 0.3;
          const active = st.changing !== null;
          mat.emissiveIntensity = active ? 0.9 + Math.sin(t * 20) * 0.3 : 0.25;
          a.position.set(e.box.x, e.box.y + h + 0.25, e.box.z);
          if (active && f < prevF - 1e-5) {
            const n = Math.ceil(dt * 60);
            for (let i = 0; i < n; i++) {
              if (e.tint === 'dry') {
                this.puffs.spawn({
                  pos: tmp.set(e.box.x + (Math.random() - 0.5) * e.box.w, e.box.y + Math.random() * h, e.box.z + (Math.random() - 0.5) * 0.4),
                  vel: new THREE.Vector3((Math.random() - 0.5) * 1.2, -0.1 + Math.random() * 0.3, (Math.random() - 0.5) * 1.6),
                  life: 2.2,
                  size: 1.4,
                  grow: 1.5,
                  color: 0xf4f8ff,
                  drag: 0.8,
                  alpha: 0.75,
                });
              } else {
                this.drops.spawn({
                  pos: tmp.set(e.box.x + (Math.random() - 0.5) * e.box.w, e.box.y + Math.random() * 0.3, e.box.z - e.box.d / 2 - 0.05),
                  vel: new THREE.Vector3((Math.random() - 0.5) * 1.5, 1 + Math.random() * 1.5, -1.5 - Math.random() * 2),
                  life: 0.8,
                  size: 0.16,
                  color: 0xbfe8ff,
                  gravity: -12,
                });
                this.drops.spawn({
                  pos: tmp.set(e.box.x + (Math.random() - 0.5) * e.box.w * 0.9, e.box.y + h * Math.random(), e.box.z + (Math.random() - 0.5) * e.box.d),
                  vel: new THREE.Vector3(0, -1, 0),
                  life: 0.6,
                  size: 0.1,
                  color: 0xe0f6ff,
                  gravity: -9,
                });
              }
            }
          }
          if (e.tint === 'dry' && f > 0.02 && Math.random() < dt * 6) {
            this.puffs.spawn({
              pos: tmp.set(e.box.x + (Math.random() - 0.5) * e.box.w, e.box.y + 0.1, e.box.z + (Math.random() - 0.5) * 0.6),
              vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.05, (Math.random() - 0.5) * 0.8),
              life: 3,
              size: 1,
              grow: 1.2,
              color: 0xffffff,
              alpha: 0.4,
            });
          }
          prevF = f;
        });
        break;
      }
      case 'pool':
        this.addPool(e);
        break;
      case 'balloon':
        this.addBalloon(e);
        break;
      case 'plate': {
        const matBase = e.role === 'absorber' ? (M.dark as THREE.MeshStandardMaterial) : e.role === 'vent' ? (M.iron as THREE.MeshStandardMaterial) : (M.copper as THREE.MeshStandardMaterial);
        const mat = matBase.clone();
        const base = mat.color.clone();
        const mesh = new THREE.Mesh(new THREE.BoxGeometry(e.box.w, e.box.h, e.box.d), mat);
        mesh.position.set(e.box.x, e.box.y + e.box.h / 2, e.box.z);
        mesh.castShadow = mesh.receiveShadow = true;
        this.root.add(mesh);
        if (e.role === 'vent') {
          for (let i = -2; i <= 2; i++) {
            const bar = new THREE.Mesh(new THREE.BoxGeometry(e.box.w * 0.9, 0.04, 0.06), M.brass);
            bar.position.set(e.box.x, e.box.y + e.box.h + 0.02, e.box.z + (i * e.box.d) / 5.5);
            this.root.add(bar);
          }
        }
        if (e.role === 'condenser') {
          const fins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), M.brass);
          this.root.add(fins);
          const balloon = g.def.entities.find((x) => x.kind === 'balloon');
          if (balloon && balloon.kind === 'balloon') {
            this.updaters.push((game) => {
              const top = game.heights.get(balloon.id)!;
              const r = this.balloonRadius(game, balloon);
              stretch(fins, tmp.set(balloon.x, top + 1.2 + r * 1.8, balloon.z), tmp2.set(e.box.x, e.box.y + e.box.h, e.box.z));
            });
            fins.scale.x = 1;
          }
        }
        let column: THREE.Mesh | null = null;
        if (e.role === 'vent' && e.updraft) {
          column = new THREE.Mesh(
            new THREE.CylinderGeometry(e.updraft.r * 0.9, e.updraft.r, e.updraft.height, 24, 1, true),
            new THREE.MeshBasicMaterial({ color: 0xffa060, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
          );
          column.position.set(e.box.x, e.box.y + e.box.h + e.updraft.height / 2, e.box.z);
          this.root.add(column);
        }
        const a = this.anchorObj(e.id);
        a.position.set(e.box.x, e.box.y + e.box.h + 0.3, e.box.z);
        const c = new THREE.Color();
        this.updaters.push((game, dt) => {
          const T = game.body(e.body).T;
          mat.color.copy(tempColor(T, base, c));
          mat.emissive.copy(glowFor(T, c));
          mat.emissiveIntensity = 1.5;
          if (column && e.updraft) {
            const s = game.updraftStrength(e.id);
            (column.material as THREE.MeshBasicMaterial).opacity = Math.min(0.12, s * 0.04);
            if (s > 0) {
              for (let i = 0; i < Math.ceil(s * 3 * dt * 60) / 3; i++) {
                const ang = Math.random() * Math.PI * 2;
                const r = Math.random() * e.updraft.r;
                this.sparks.spawn({
                  pos: tmp.set(e.box.x + Math.cos(ang) * r, e.box.y + 0.2, e.box.z + Math.sin(ang) * r),
                  vel: new THREE.Vector3(Math.cos(ang + 1.5) * 0.4, 2 + s * 1.4, Math.sin(ang + 1.5) * 0.4),
                  life: 2.4,
                  size: 0.12,
                  color: 0xffc080,
                  alpha: 0.6,
                });
              }
            }
          }
          if (e.role === 'condenser' && T < 80) {
            const bal = game.def.entities.find((x) => x.kind === 'balloon');
            if (bal && game.body(bal.kind === 'balloon' ? bal.body : '').massOf('gas') > 0.5 && Math.random() < dt * 30) {
              this.drops.spawn({
                pos: tmp.set(e.box.x + (Math.random() - 0.5) * e.box.w, e.box.y + e.box.h, e.box.z + (Math.random() - 0.5) * e.box.d),
                vel: new THREE.Vector3(0, -0.5, 0),
                life: 0.7,
                size: 0.14,
                color: 0xbfe8ff,
                gravity: -6,
              });
            }
          }
        });
        break;
      }
      case 'rod':
        this.addRod(e);
        break;
      case 'mirror':
        this.addMirror(e);
        break;
      case 'button': {
        const disc = new THREE.Mesh(new THREE.CylinderGeometry(e.box.w / 2, e.box.w / 2 + 0.05, e.box.h, 28), M.brass);
        disc.receiveShadow = true;
        this.root.add(disc);
        const isDark = e.id.toLowerCase().includes('dark');
        const icon = new THREE.Mesh(
          new THREE.CircleGeometry(e.box.w * 0.32, 24),
          new THREE.MeshStandardMaterial({ color: isDark ? 0x24222a : 0xffffff, roughness: 0.9, emissive: isDark ? 0x000000 : 0x445566 }),
        );
        icon.rotation.x = -Math.PI / 2;
        this.root.add(icon);
        const a = this.anchorObj(e.id);
        a.position.set(e.box.x, e.box.y + 0.6, e.box.z);
        this.updaters.push((game) => {
          const down = game.player.groundId === e.id ? 0.05 : 0;
          disc.position.set(e.box.x, e.box.y + e.box.h / 2 - down, e.box.z);
          icon.position.set(e.box.x, e.box.y + e.box.h + 0.005 - down, e.box.z);
        });
        break;
      }
      case 'plunger':
        this.addPlunger(e);
        break;
      case 'gate': {
        const grp = new THREE.Group();
        const mat = e.style === 'brass' ? M.brass : M.iron;
        const frameMat = M.iron;
        const n = Math.max(3, Math.round(e.box.w / 0.28));
        for (let i = 0; i < n; i++) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(0.07, e.box.h, 0.07), mat);
          bar.position.set(-e.box.w / 2 + 0.1 + (i / (n - 1)) * (e.box.w - 0.2), e.box.h / 2, 0);
          bar.castShadow = true;
          grp.add(bar);
        }
        for (const y of [0.15, e.box.h / 2, e.box.h - 0.15]) {
          const bar = new THREE.Mesh(new THREE.BoxGeometry(e.box.w, 0.1, e.box.d * 0.6), frameMat);
          bar.position.y = y;
          bar.castShadow = true;
          grp.add(bar);
        }
        this.root.add(grp);
        const a = this.anchorObj(e.id);
        a.position.set(e.box.x, e.box.y + e.box.h + 0.3, e.box.z);
        this.updaters.push((game) => {
          const o = game.gateOpen.get(e.id) ?? 0;
          grp.position.set(e.box.x, e.box.y + o * (e.box.h - 0.1), e.box.z);
        });
        break;
      }
      case 'lift':
        this.addLift(e);
        break;
    }
  }

  balloonRadius(game: Game, e: Extract<EntityDef, { kind: 'balloon' }>) {
    const gas = game.body(e.body).massOf('gas');
    const V = gas / 0.6; // m³ of steam at 100 °C
    const r = Math.cbrt((3 * V) / (4 * Math.PI));
    return Math.max(0.45, r);
  }

  private addPool(e: Extract<EntityDef, { kind: 'pool' }>) {
    const a = e.area;
    const waterMat = new THREE.MeshStandardMaterial({
      color: 0x2a86c0,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.86,
      normalMap: this.waterNormal,
      normalScale: new THREE.Vector2(0.6, 0.6),
    });
    const iceMat = this.iceMaterial('clear');
    const water = new THREE.Mesh(new THREE.BoxGeometry(a.w, 1, a.d), waterMat);
    water.receiveShadow = true;
    this.root.add(water);
    const anchor = this.anchorObj(e.id);
    if (e.levelMode === 'fixed') {
      const left = new THREE.Mesh(new THREE.BoxGeometry(a.w, 0.25, 1), iceMat);
      const right = left.clone();
      left.castShadow = right.castShadow = true;
      left.receiveShadow = right.receiveShadow = true;
      this.root.add(left, right);
      const top = e.surfaceY ?? 0;
      water.scale.y = top - e.floorY;
      water.position.set(a.x, e.floorY + (top - e.floorY) / 2, a.z);
      anchor.position.set(a.x, top + 0.4, a.z);
      this.updaters.push((game, dt, t) => {
        const st = game.body(e.body).state;
        const f = st.frac.solid;
        const reach = (a.d / 2) * Math.min(1, f / 0.97);
        left.visible = right.visible = f > 0.01;
        left.scale.z = Math.max(0.01, reach);
        right.scale.z = Math.max(0.01, reach);
        left.position.set(a.x, top - 0.12, a.z - a.d / 2 + reach / 2);
        right.position.set(a.x, top - 0.12, a.z + a.d / 2 - reach / 2);
        this.waterNormal.offset.set(t * 0.25, t * 0.05);
        waterMat.color.setHex(st.T > 20 ? 0x3a90b8 : 0x2a86c0);
        if (st.changing && game.glove === 'cold' && game.target === e.id) {
          for (let i = 0; i < 3; i++) {
            const z = Math.random() < 0.5 ? a.z - a.d / 2 + reach : a.z + a.d / 2 - reach;
            this.sparks.spawn({
              pos: tmp.set(a.x + (Math.random() - 0.5) * a.w, top + 0.02, z),
              vel: new THREE.Vector3((Math.random() - 0.5) * 0.6, 0.4, (Math.random() - 0.5) * 0.6),
              life: 0.6,
              size: 0.18,
              color: 0xbfefff,
            });
          }
        }
        // flowing water flecks
        if (f < 0.97 && Math.random() < dt * 20) {
          this.drops.spawn({
            pos: tmp.set(a.x - a.w / 2, top + 0.02, a.z + (Math.random() - 0.5) * a.d * (1 - f)),
            vel: new THREE.Vector3(1.6, 0, 0),
            life: a.w / 1.6,
            size: 0.12,
            color: 0xe8fbff,
            alpha: 0.5,
          });
        }
      });
      return;
    }
    // basins: liquid from the floor, ice block floating, steam when boiling
    const block = new THREE.Mesh(rockGeometry(a.w * 0.92, 1, a.d * 0.92, 0.03), iceMat);
    block.castShadow = true;
    this.root.add(block);
    let markObj: THREE.Object3D | null = null;
    if (e.markKg) {
      const y = e.floorY + e.markKg / 1000 / (a.w * a.d);
      const ring = new THREE.Mesh(new THREE.BoxGeometry(a.w + 0.3, 0.035, a.d + 0.3), new THREE.MeshStandardMaterial({ color: 0xffd36b, emissive: 0xffa000, emissiveIntensity: 0.8 }));
      ring.position.set(a.x, y, a.z);
      this.root.add(ring);
      const lbl = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(`${e.markKg} ק״ג`), depthTest: false }));
      lbl.scale.set(0.8, 0.4, 1);
      lbl.position.set(a.x + a.w / 2 + 0.5, y, a.z);
      lbl.renderOrder = 8;
      this.root.add(lbl);
      markObj = ring;
    }
    void markObj;
    this.updaters.push((game, dt, t) => {
      const b = game.body(e.body);
      const st = b.state;
      const liq = b.massOf('liquid') / 1000;
      const sol = b.massOf('solid') / 917;
      const area = a.w * a.d;
      const hl = liq / area;
      const hs = sol / (area * 0.85);
      water.visible = hl > 0.004;
      water.scale.y = Math.max(0.001, hl);
      water.position.set(a.x, e.floorY + hl / 2, a.z);
      block.visible = hs > 0.004;
      block.scale.y = Math.max(0.001, hs);
      block.position.set(a.x, e.floorY + hl + hs / 2 - Math.min(hl, hs * 0.9), a.z);
      if (block.position.y < e.floorY + hs / 2) block.position.y = e.floorY + hs / 2;
      anchor.position.set(a.x, e.floorY + Math.max(hl, hs) + 0.35, a.z);
      this.waterNormal.offset.set(t * 0.1, t * 0.07);
      const hot = clamp((st.T - 20) / 80, 0, 1);
      waterMat.color.setRGB(0.16 + hot * 0.2, 0.52 + hot * 0.05, 0.75 - hot * 0.2);
      // boiling: bubbles + white clouds of droplets above the (invisible) steam
      if (st.changing?.to === 'gas' && game.glove === 'heat' && game.target === e.id) {
        for (let i = 0; i < 2; i++) {
          this.puffs.spawn({
            pos: tmp.set(a.x + (Math.random() - 0.5) * a.w, e.floorY + hl + 0.05, a.z + (Math.random() - 0.5) * a.d),
            vel: new THREE.Vector3((Math.random() - 0.5) * 0.4, 1.4 + Math.random(), (Math.random() - 0.5) * 0.4),
            life: 1.8,
            size: 0.9,
            grow: 2,
            color: 0xffffff,
            alpha: 0.7,
          });
          this.drops.spawn({
            pos: tmp.set(a.x + (Math.random() - 0.5) * a.w, e.floorY + hl, a.z + (Math.random() - 0.5) * a.d),
            vel: new THREE.Vector3(0, 0.8, 0),
            life: 0.25,
            size: 0.12,
            color: 0xffffff,
          });
        }
      } else if (st.T > 60 && hl > 0.01 && Math.random() < dt * 4) {
        this.puffs.spawn({
          pos: tmp.set(a.x + (Math.random() - 0.5) * a.w, e.floorY + hl + 0.05, a.z),
          vel: new THREE.Vector3(0, 0.6, 0),
          life: 2,
          size: 0.6,
          grow: 1.5,
          color: 0xffffff,
          alpha: 0.35,
        });
      }
      if (st.changing?.to === 'solid' || (st.changing?.from === 'liquid' && game.glove === 'cold' && game.target === e.id)) {
        if (Math.random() < dt * 40)
          this.sparks.spawn({
            pos: tmp.set(a.x + (Math.random() - 0.5) * a.w, e.floorY + hl + hs + 0.02, a.z + (Math.random() - 0.5) * a.d),
            vel: new THREE.Vector3(0, 0.3, 0),
            life: 0.5,
            size: 0.15,
            color: 0xbfefff,
          });
      }
    });
  }

  private addBalloon(e: Extract<EntityDef, { kind: 'balloon' }>) {
    const M = this.world.mats;
    const deck = new THREE.Group();
    const floor = new THREE.Mesh(new THREE.BoxGeometry(e.platform.w, 0.3, e.platform.d), M.wood);
    floor.position.y = -0.15;
    floor.castShadow = floor.receiveShadow = true;
    deck.add(floor);
    for (const [sx, sz] of [
      [1, 1],
      [1, -1],
      [-1, 1],
      [-1, -1],
    ]) {
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.7, 8), M.brass);
      post.position.set((sx * (e.platform.w - 0.1)) / 2, 0.35, (sz * (e.platform.d - 0.1)) / 2);
      deck.add(post);
    }
    const railGeo = new THREE.BoxGeometry(e.platform.w, 0.05, 0.05);
    for (const sz of [1, -1]) {
      const r = new THREE.Mesh(railGeo, M.brass);
      r.position.set(0, 0.7, (sz * (e.platform.d - 0.1)) / 2);
      deck.add(r);
    }
    this.root.add(deck);
    const envMat = new THREE.MeshStandardMaterial({ color: 0xf1dfc0, roughness: 0.65, metalness: 0.05, emissive: 0x3a2010, emissiveIntensity: 0.2 });
    const env = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), envMat);
    env.castShadow = true;
    this.root.add(env);
    // brass ribs
    const ribs = new THREE.Group();
    for (let i = 0; i < 8; i++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(1.005, 0.012, 6, 48, Math.PI), M.brass);
      rib.rotation.y = (i / 8) * Math.PI;
      rib.rotation.z = Math.PI / 2;
      ribs.add(rib);
    }
    this.root.add(ribs);
    const ropes: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const r = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 1, 4), new THREE.MeshStandardMaterial({ color: 0x6b5236 }));
      ropes.push(r);
      this.root.add(r);
    }
    const basin = this.game.def.drains?.find((d) => d.to === e.body && d.phase === 'gas');
    const basinEnt = basin ? this.game.def.entities.find((x) => x.kind === 'pool' && x.body === basin.from) : null;
    const hose = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 8), M.brass);
    this.root.add(hose);
    // Tripo balloon split in two with clipping planes: its basket is the ride (fixed size),
    // its envelope swells with the gas inside (radius from the real steam volume).
    const basketModel = this.models.get('balloon');
    const envModel = this.models.get('balloon');
    const basketCut = new THREE.Plane(new THREE.Vector3(0, -1, 0), 0);
    const envCut = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    const clipWith = (o: THREE.Object3D, plane: THREE.Plane) =>
      o.traverse((m) => {
        const mesh = m as THREE.Mesh;
        if (!mesh.isMesh) return;
        const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
        mat.clippingPlanes = [plane];
        mat.side = THREE.DoubleSide;
        mesh.material = mat;
      });
    if (basketModel && envModel) {
      clipWith(basketModel, basketCut);
      clipWith(envModel, envCut);
      env.visible = false;
      ribs.visible = false;
      deck.children.forEach((c) => (c.visible = false));
      this.root.add(basketModel, envModel);
    }
    const BASKET_S = e.platform.w / 0.42;
    const anchor = this.anchorObj(e.id);
    this.updaters.push((game, _dt, t) => {
      const top = game.heights.get(e.id)!;
      deck.position.set(e.x, top, e.z);
      if (basketModel && envModel) {
        // model profile: basket floor at 0.10 of its height, basket top 0.31, envelope from 0.42 (max radius 0.30)
        basketModel.scale.setScalar(BASKET_S);
        basketModel.position.set(e.x, top - 0.1 * BASKET_S, e.z);
        basketCut.constant = top + 0.21 * BASKET_S;
        const rr = Math.min(this.balloonRadius(game, e), 3.2);
        const S = rr / 0.3;
        const bottom = top + 1.9;
        envModel.scale.setScalar(S);
        envModel.position.set(e.x, bottom - 0.42 * S, e.z);
        envModel.rotation.y = Math.sin(t * 0.4) * 0.06;
        envCut.constant = -(bottom - 0.02 * S);
      }
      const r = this.balloonRadius(game, e);
      const full = clamp(game.body(e.body).massOf('gas') / e.fullKg, 0, 1);
      const cy = top + 1.2 + r;
      env.position.set(e.x, cy, e.z);
      env.scale.set(r, r * (full < 0.05 ? 0.6 : 1.05), r);
      ribs.position.copy(env.position);
      ribs.scale.copy(env.scale);
      env.rotation.y = Math.sin(t * 0.5) * 0.05;
      const corners = [
        [1, 1],
        [1, -1],
        [-1, 1],
        [-1, -1],
      ];
      corners.forEach(([sx, sz], i) => {
        if (basketModel) {
          const rr = Math.min(this.balloonRadius(game, e), 3.2);
          stretch(ropes[i], tmp.set(e.x + (sx * e.platform.w) / 2.5, top + 1.25, e.z + (sz * e.platform.d) / 2.5), new THREE.Vector3(e.x + sx * rr * 0.45, top + 1.95 + rr * 0.15, e.z + sz * rr * 0.45));
        } else stretch(ropes[i], tmp.set(e.x + (sx * e.platform.w) / 2.2, top + 0.7, e.z + (sz * e.platform.d) / 2.2), new THREE.Vector3(e.x + sx * r * 0.6, cy - r * 0.75, e.z + sz * r * 0.6));
      });
      if (basinEnt && basinEnt.kind === 'pool') {
        stretch(hose, tmp.set(basinEnt.area.x, basinEnt.floorY + 0.5, basinEnt.area.z), new THREE.Vector3(e.x - e.platform.w / 2.4, top + 0.3, e.z));
      }
      anchor.position.set(e.x, cy - r - 0.1, e.z);
    });
  }

  private addRod(e: Extract<EntityDef, { kind: 'rod' }>) {
    const M = this.world.mats;
    const ids = this.game.rodBodies(e);
    const from = new THREE.Vector3(e.from.x, e.from.y, e.from.z);
    const to = new THREE.Vector3(e.to.x, e.to.y, e.to.z);
    const segs: { mesh: THREE.Mesh; mat: THREE.MeshStandardMaterial; base: THREE.Color }[] = [];
    const baseMat = (e.mat === 'copper' ? M.copper : e.mat === 'wood' ? M.wood : M.iron) as THREE.MeshStandardMaterial;
    ids.forEach((_, i) => {
      const mat = baseMat.clone();
      const mesh = new THREE.Mesh(new THREE.CylinderGeometry(e.radius, e.radius, 1, 12), mat);
      const a = from.clone().lerp(to, i / ids.length);
      const b = from.clone().lerp(to, (i + 1) / ids.length);
      stretch(mesh, a, b);
      mesh.castShadow = true;
      this.root.add(mesh);
      segs.push({ mesh, mat, base: mat.color.clone() });
    });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(e.radius * 2.2, 14, 10), M.brass);
    cap.position.copy(from);
    this.root.add(cap);
    const plate = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(e.mat === 'copper' ? 'נחושת' : e.mat === 'wood' ? 'עץ' : 'ברזל'), depthTest: true }));
    plate.scale.set(0.8, 0.4, 1);
    plate.position.copy(from).add(new THREE.Vector3(0, -0.45, 0.1));
    this.root.add(plate);
    const anchor = this.anchorObj(e.id);
    anchor.position.copy(from).add(new THREE.Vector3(0, 0.35, 0));
    const c = new THREE.Color();
    this.updaters.push((game, dt) => {
      ids.forEach((id, i) => {
        const T = game.body(id).T;
        const s = segs[i];
        if (e.mat === 'wood') {
          s.mat.color.copy(s.base).lerp(new THREE.Color(0x2a1a10), clamp((T - 60) / 120, 0, 1));
          s.mat.emissive.setRGB(clamp((T - 150) / 60, 0, 1) * 0.6, 0.1 * clamp((T - 150) / 60, 0, 1), 0);
          if (T > 110 && Math.random() < dt * (T / 25)) {
            this.puffs.spawn({
              pos: s.mesh.position.clone(),
              vel: new THREE.Vector3((Math.random() - 0.5) * 0.3, 0.9, (Math.random() - 0.5) * 0.3),
              life: 2.2,
              size: 0.5,
              grow: 2,
              color: 0x6a6670,
              alpha: 0.6,
            });
          }
        } else {
          s.mat.color.copy(tempColor(T, s.base, c));
          s.mat.emissive.copy(glowFor(T, c));
          s.mat.emissiveIntensity = 2;
        }
      });
    });
  }

  private addMirror(e: Extract<EntityDef, { kind: 'mirror' }>) {
    const M = this.world.mats;
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, e.pos.y, 10), M.brass);
    stand.position.set(e.pos.x, e.pos.y / 2, e.pos.z);
    this.root.add(stand);
    const disc = new THREE.Group();
    const glass = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 1, roughness: 0.02, side: THREE.DoubleSide }));
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 32), M.brass);
    disc.add(glass, ring);
    disc.position.set(e.pos.x, e.pos.y, e.pos.z);
    this.root.add(disc);
    const tm = this.models.get('sun-mirror');
    if (tm) {
      glass.visible = false;
      ring.visible = false;
      stand.visible = false;
      tm.scale.setScalar(1.8);
      tm.position.set(0, -1.15, 0);
      disc.add(tm);
    }
    const beamMat = new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.32, blending: THREE.AdditiveBlending, depthWrite: false });
    const sunBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.5, 1, 16, 1, true), beamMat);
    stretch(sunBeam, new THREE.Vector3(e.sun.x, e.sun.y, e.sun.z), new THREE.Vector3(e.pos.x, e.pos.y, e.pos.z));
    this.root.add(sunBeam);
    const outBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.3, 1, 16, 1, true), beamMat.clone());
    this.root.add(outBeam);
    const spot = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('#ffe0a0'), blending: THREE.AdditiveBlending, depthWrite: false, color: 0xffcc66 }));
    spot.scale.setScalar(1.3);
    this.root.add(spot);
    const sunV = new THREE.Vector3(e.sun.x, e.sun.y, e.sun.z);
    const P = new THREE.Vector3(e.pos.x, e.pos.y, e.pos.z);
    const look = new THREE.Vector3();
    this.updaters.push((game, _dt, t) => {
      const i = game.mirrorAim.get(e.id) ?? -1;
      const aim = i >= 0 ? e.aims[i] : null;
      const target = aim ? new THREE.Vector3(aim.at.x, aim.at.y, aim.at.z) : new THREE.Vector3(e.pos.x + 1, e.pos.y - 1, e.pos.z);
      // mirror normal bisects the incoming and outgoing directions
      const n = tmp.copy(sunV).sub(P).normalize().add(tmp2.copy(target).sub(P).normalize()).normalize();
      look.copy(P).add(n);
      disc.lookAt(look);
      outBeam.visible = !!aim;
      spot.visible = !!aim;
      if (aim) {
        stretch(outBeam, P, target);
        spot.position.copy(target);
        const white = aim.target === 'latch';
        spot.scale.setScalar((white ? 0.9 : 1.4) + Math.sin(t * 6) * 0.08);
        (spot.material as THREE.SpriteMaterial).color.setHex(white ? 0xffffff : 0xffaa44);
        // the white snow sends most of the light back: show a faint reflected glint
        if (white && Math.random() < 0.3)
          this.sparks.spawn({ pos: target.clone(), vel: new THREE.Vector3((Math.random() - 0.5) * 3, Math.random() * 2, 2 + Math.random() * 2), life: 0.5, size: 0.15, color: 0xffffff });
      }
    });
  }

  private addPlunger(e: Extract<EntityDef, { kind: 'plunger' }>) {
    const M = this.world.mats;
    const top = new THREE.Mesh(new THREE.CylinderGeometry(e.box.w / 2, e.box.w / 2, 0.14, 28), M.brass);
    top.castShadow = top.receiveShadow = true;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(e.box.w / 2.6, e.box.w / 2.4, 1, 20), M.iron);
    this.root.add(top, shaft);
    const pts = e.pipe.map((p) => new THREE.Vector3(p.x, p.y, p.z));
    pts.unshift(new THREE.Vector3(e.box.x, 0.2, e.box.z));
    const tube = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.09, 10), M.brass);
    tube.castShadow = true;
    this.root.add(tube);
    // riser to the glass bulb
    const riser = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1, 8), M.brass);
    stretch(riser, new THREE.Vector3(e.bulb.x, 0.2, e.bulb.z - 0.4), new THREE.Vector3(e.bulb.x, e.bulb.y, e.bulb.z));
    this.root.add(riser);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.3, 24, 16), this.world.mats.glass);
    bulb.position.set(e.bulb.x, e.bulb.y, e.bulb.z);
    bulb.renderOrder = 3;
    this.root.add(bulb);
    const water = new THREE.Mesh(new THREE.SphereGeometry(0.26, 20, 14), new THREE.MeshStandardMaterial({ color: 0x2a86c0, roughness: 0.1, transparent: true, opacity: 0.9 }));
    const ice = new THREE.Mesh(new THREE.IcosahedronGeometry(0.25, 0), this.iceMaterial('clear'));
    water.position.copy(bulb.position);
    ice.position.copy(bulb.position);
    this.root.add(water, ice);
    const label = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(e.body === 'airpipe' ? 'אוויר' : 'מים H₂O') }));
    label.scale.set(0.8, 0.4, 1);
    label.position.set(e.bulb.x, e.bulb.y + 0.55, e.bulb.z);
    this.root.add(label);
    const pump = this.models.get('plunger');
    if (pump) {
      pump.scale.setScalar(1.5);
      pump.rotation.y = Math.PI / 2;
      pump.position.set(e.box.x + (e.box.x < 0 ? -1.1 : 1.1), 0, e.box.z - 0.4);
      this.root.add(pump);
    }
    // far piston under the gate
    const gate = this.game.def.entities.find((x) => x.kind === 'gate');
    const piston = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 1, 14), M.brass);
    this.root.add(piston);
    const anchor = this.anchorObj(e.id);
    anchor.position.set(e.bulb.x, e.bulb.y + 0.45, e.bulb.z);
    const end = e.pipe[e.pipe.length - 1];
    this.updaters.push((game, _dt, t) => {
      const d = game.plungerDepth.get(e.id) ?? 0;
      const h = e.box.h - d;
      top.position.set(e.box.x, e.box.y + h - 0.07, e.box.z);
      shaft.scale.y = Math.max(0.05, h - 0.1);
      shaft.position.set(e.box.x, e.box.y + (h - 0.1) / 2, e.box.z);
      const f = game.body(e.body).state.frac;
      const isAir = game.body(e.body).mat === 'air';
      water.visible = !isAir && f.liquid > 0.05;
      water.scale.setScalar(Math.max(0.05, f.liquid));
      ice.visible = !isAir && f.solid > 0.05;
      ice.scale.setScalar(Math.max(0.1, Math.cbrt(f.solid)));
      ice.rotation.y = t * 0.2;
      const push = game.plungerPush(e.id);
      const open = gate ? game.gateOpen.get(gate.id) ?? 0 : 0;
      piston.scale.y = 0.4 + Math.max(push, open) * 2.2;
      piston.position.set(end.x, 0.2 + piston.scale.y / 2, end.z - 0.4);
    });
  }

  private addLift(e: Extract<EntityDef, { kind: 'lift' }>) {
    const M = this.world.mats;
    const tubeH = e.height + 0.6;
    const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, tubeH, 16, 1, true), this.world.mats.glass);
    tube.position.set(e.x, e.baseY + 0.35 + tubeH / 2, e.z + 0.95);
    tube.renderOrder = 3;
    this.root.add(tube);
    const liquidMat = new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xc01000, emissiveIntensity: 0.9, roughness: 0.3 });
    const liquid = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 1, 12), liquidMat);
    this.root.add(liquid);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.28, 18, 14), liquidMat);
    bulb.position.set(e.x, e.baseY + 0.35, e.z + 0.95);
    this.root.add(bulb);
    // tick marks every 20 °C with labels
    for (let T = Math.ceil(e.Tmin / 20) * 20; T <= e.Tmax; T += 20) {
      const y = e.baseY + 0.35 + (e.height * (T - e.Tmin)) / (e.Tmax - e.Tmin);
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.03, 0.05), M.brass);
      tick.position.set(e.x, y, e.z + 0.95);
      this.root.add(tick);
      if (T % 40 === 0 || T === 0) {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(`${T}°`) }));
        s.scale.set(0.6, 0.3, 1);
        s.position.set(e.x + 0.6, y, e.z + 0.95);
        this.root.add(s);
      }
    }
    // tank at the base
    const tankMat =
      e.tank === 'iron'
        ? (M.iron as THREE.MeshStandardMaterial).clone()
        : e.tank === 'ice'
          ? this.iceMaterial('clear')
          : new THREE.MeshStandardMaterial({ color: 0x2a86c0, roughness: 0.15, transparent: true, opacity: 0.85 });
    const b = this.game.body(e.body);
    const vol = e.tank === 'iron' ? b.mass / 7870 : b.mass / 1000;
    const side = Math.cbrt(vol);
    const tank = new THREE.Mesh(new THREE.BoxGeometry(side, side, side), tankMat);
    tank.castShadow = true;
    const cage = new THREE.Mesh(new THREE.BoxGeometry(side + 0.12, side + 0.06, side + 0.12), new THREE.MeshStandardMaterial({ color: 0xd9a548, metalness: 0.9, roughness: 0.3, wireframe: true }));
    this.root.add(tank, cage);
    const meltWater = new THREE.Mesh(new THREE.BoxGeometry(side, 1, side), new THREE.MeshStandardMaterial({ color: 0x2a86c0, roughness: 0.1, transparent: true, opacity: 0.8 }));
    this.root.add(meltWater);
    const platMat = (M.brass as THREE.MeshStandardMaterial).clone();
    const plat = new THREE.Mesh(new THREE.CylinderGeometry(e.platform, e.platform, 0.25, 32), platMat);
    plat.castShadow = plat.receiveShadow = true;
    this.root.add(plat);
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.2, 1, 12), M.brass);
    this.root.add(column);
    const name = new THREE.Sprite(new THREE.SpriteMaterial({ map: labelTexture(`${Math.round(b.mass)} ק״ג`) }));
    name.scale.set(0.9, 0.45, 1);
    this.root.add(name);
    const tower = this.models.get('thermo-lift');
    if (tower) {
      tower.scale.setScalar(3.4);
      tower.position.set(e.x + (e.x < 0 ? -1.5 : 1.5), e.baseY, e.z - 0.55);
      this.root.add(tower);
    }
    const anchor = this.anchorObj(e.id);
    const c = new THREE.Color();
    this.updaters.push((game) => {
      const top = game.heights.get(e.id)!;
      plat.position.set(e.x, top - 0.125, e.z);
      stretch(column, new THREE.Vector3(e.x, e.baseY + side, e.z), new THREE.Vector3(e.x, top - 0.25, e.z));
      stretch(liquid, new THREE.Vector3(e.x, e.baseY + 0.35, e.z + 0.95), new THREE.Vector3(e.x, top, e.z + 0.95));
      const body = game.body(e.body);
      const st = body.state;
      const sol = e.tank === 'ice' ? st.frac.solid : 1;
      tank.scale.set(1, Math.max(0.02, e.tank === 'ice' ? sol : 1), 1);
      tank.position.set(e.x, e.baseY + (side * tank.scale.y) / 2, e.z);
      cage.position.set(e.x, e.baseY + side / 2 + 0.03, e.z);
      meltWater.visible = e.tank === 'ice' && st.frac.liquid > 0.01;
      const hw = side * st.frac.liquid * 0.92;
      meltWater.scale.y = Math.max(0.001, hw);
      meltWater.position.set(e.x, e.baseY + hw / 2, e.z);
      if (e.tank === 'iron') {
        (tankMat as THREE.MeshStandardMaterial).emissive.copy(glowFor(st.T, c));
        (tankMat as THREE.MeshStandardMaterial).emissiveIntensity = 2;
      }
      name.position.set(e.x, e.baseY + side + 0.35, e.z + side / 2 + 0.2);
      anchor.position.set(e.x, e.baseY + side + 0.15, e.z);
      // the column glows while stuck on a plateau
      liquidMat.emissiveIntensity = st.changing ? 0.6 + 0.5 * Math.abs(Math.sin(performance.now() / 180)) : 0.9;
    });
  }

  private addExit() {
    const ex = this.game.def.exit;
    const g = new THREE.Group();
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xf3eee6, roughness: 0.6 });
    const red = new THREE.MeshStandardMaterial({ color: 0xc23a2a, roughness: 0.6 });
    const t1 = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.6, 1.6, 16), towerMat);
    t1.position.y = 0.8;
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.47, 0.5, 0.3, 16), red);
    band.position.y = 0.9;
    const deck = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.08, 16), this.world.mats.brass);
    deck.position.y = 1.64;
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.4, 12), new THREE.MeshStandardMaterial({ color: 0xffd38a, emissive: 0xffa040, emissiveIntensity: 3 }));
    lamp.position.y = 1.9;
    const roof = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.35, 12), red);
    roof.position.y = 2.27;
    g.add(t1, band, deck, lamp, roof);
    g.traverse((o) => ((o as THREE.Mesh).castShadow = true));
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('#ffd38a'), color: 0xffb060, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(3.2);
    glow.position.y = 1.9;
    g.add(glow);
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.7, 7, 16, 1, true),
      new THREE.MeshBasicMaterial({ color: 0xffd38a, transparent: true, opacity: 0.18, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    beam.rotation.z = Math.PI / 2;
    beam.position.set(3.5, 0, 0);
    const pivot = new THREE.Group();
    pivot.position.y = 1.9;
    pivot.add(beam);
    g.add(pivot);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.9, 1.1, 40),
      new THREE.MeshBasicMaterial({ color: 0xffc060, transparent: true, opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.05;
    g.add(ring);
    g.position.set(ex.x, ex.y, ex.z - 0.6);
    this.root.add(g);
    const light = new THREE.PointLight(0xffa050, 18, 9, 1.6);
    light.position.set(ex.x, ex.y + 1.9, ex.z - 0.6);
    this.root.add(light);
    this.exitLight = light;
    const anchor = this.anchorObj('exit');
    anchor.position.set(ex.x, ex.y + 2.7, ex.z - 0.6);
    this.updaters.push((_g, dt, t) => {
      pivot.rotation.y += dt * 1.2;
      ring.scale.setScalar(1 + Math.sin(t * 3) * 0.08);
      if (this.exitLight) this.exitLight.intensity = 16 + Math.sin(t * 4) * 3;
    });
  }

  private addDecor() {
    // brass lamp posts near the spawn and warm light pools, plus the Tripo observatory in the distance
    const sp = this.game.def.spawn;
    const M = this.world.mats;
    for (const sx of [-1, 1]) {
      const post = new THREE.Group();
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.08, 2.2, 8), M.brass);
      pole.position.y = 1.1;
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 10), new THREE.MeshStandardMaterial({ color: 0xffd38a, emissive: 0xffa040, emissiveIntensity: 3 }));
      lamp.position.y = 2.3;
      post.add(pole, lamp);
      post.position.set(sp.x + sx * 2.6, sp.y, sp.z + 1.2);
      this.root.add(post);
      const pl = new THREE.PointLight(0xffa050, 6, 6, 1.8);
      pl.position.set(sp.x + sx * 2.6, sp.y + 2.3, sp.z + 1.2);
      this.root.add(pl);
    }
    // the island around the playable strip: low snowy shelves, boulders and ice shards
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
    for (const st of this.game.def.statics) {
      minX = Math.min(minX, st.x - st.w / 2);
      maxX = Math.max(maxX, st.x + st.w / 2);
      minZ = Math.min(minZ, st.z - st.d / 2);
      maxZ = Math.max(maxZ, st.z + st.d / 2);
    }
    let seed = this.game.def.index * 97;
    const r = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (const side of [-1, 1]) {
      const x0 = side < 0 ? minX : maxX;
      const shelf = new THREE.Mesh(rockGeometry(10, 3, maxZ - minZ + 10, 0.4), M.basalt);
      shelf.position.set(x0 + side * 5, -2.6, (minZ + maxZ) / 2);
      shelf.receiveShadow = true;
      this.root.add(shelf);
      const cap = new THREE.Mesh(new THREE.BoxGeometry(10, 0.15, maxZ - minZ + 10), M.snow);
      cap.position.set(x0 + side * 5, -1.05, (minZ + maxZ) / 2);
      cap.receiveShadow = true;
      this.root.add(cap);
      for (let i = 0; i < 9; i++) {
        const b = new THREE.Mesh(new THREE.DodecahedronGeometry(0.6 + r() * 1.4, 0), M.basalt);
        b.position.set(x0 + side * (1.2 + r() * 7), -1 + r() * 0.6, minZ + r() * (maxZ - minZ));
        b.scale.y = 0.6 + r() * 0.9;
        b.rotation.set(r(), r() * 6, r());
        b.castShadow = b.receiveShadow = true;
        this.root.add(b);
        if (r() < 0.6) {
          const capB = new THREE.Mesh(new THREE.DodecahedronGeometry(1, 0), M.snow);
          capB.scale.set(b.scale.x * 0.9 * (b.geometry as THREE.DodecahedronGeometry).parameters.radius, 0.35, b.scale.z * 0.9 * (b.geometry as THREE.DodecahedronGeometry).parameters.radius);
          capB.position.copy(b.position).add(new THREE.Vector3(0, (b.geometry as THREE.DodecahedronGeometry).parameters.radius * b.scale.y * 0.7, 0));
          this.root.add(capB);
        }
      }
      for (let i = 0; i < 6; i++) {
        const shard = new THREE.Mesh(new THREE.ConeGeometry(0.25 + r() * 0.3, 1.2 + r() * 1.8, 5), this.iceMaterial('clear'));
        shard.position.set(x0 + side * (0.8 + r() * 4), -0.6, minZ + r() * (maxZ - minZ));
        shard.rotation.set((r() - 0.5) * 0.6, r() * 6, (r() - 0.5) * 0.6);
        this.root.add(shard);
      }
    }
    // a cliff edge under the start so the island has a front
    const front = new THREE.Mesh(rockGeometry(maxX - minX + 20, 4, 6, 0.4), M.basalt);
    front.position.set((minX + maxX) / 2, -4.3, maxZ + 2.5);
    this.root.add(front);
    const obs = this.models.get('observatory');
    if (obs) {
      obs.scale.setScalar(9);
      const ex = this.game.def.exit;
      obs.position.set(this.game.def.index === 6 ? ex.x : -14, this.game.def.index === 6 ? ex.y - 1 : 0.5, this.game.def.index === 6 ? ex.z - 7 : ex.z - 6);
      obs.rotation.y = this.game.def.index === 6 ? 0 : 0.6;
      this.root.add(obs);
    }
  }

  update(dt: number, t: number) {
    for (const u of this.updaters) u(this.game, dt, t);
    this.sparks.update(dt);
    this.puffs.update(dt);
    this.drops.update(dt);
  }

  /** World position for an entity's gauge/hint anchor. */
  anchorOf(id: string, out: THREE.Vector3): THREE.Vector3 | null {
    const a = this.anchors.get(id);
    if (!a) return null;
    return a.getWorldPosition(out);
  }

  splash(at: THREE.Vector3) {
    for (let i = 0; i < 40; i++) {
      this.drops.spawn({
        pos: at.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 5, 3 + Math.random() * 4, (Math.random() - 0.5) * 5),
        life: 0.9,
        size: 0.2,
        color: 0xcfefff,
        gravity: -14,
      });
    }
  }

  burst(at: THREE.Vector3, color: number, n = 40, size = 0.25) {
    for (let i = 0; i < n; i++) {
      this.sparks.spawn({
        pos: at.clone(),
        vel: new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 5, (Math.random() - 0.5) * 6),
        life: 0.8,
        size,
        color,
        gravity: -6,
        drag: 1.5,
      });
    }
  }
}
