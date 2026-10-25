import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { glowSprite } from './textures';

export interface ExplorerPose {
  speed: number;
  onGround: boolean;
  vy: number;
  aiming: 'heat' | 'cold' | null;
  gliding: boolean;
  won: boolean;
  splashing: boolean;
}

type ClipKey = 'idle' | 'run' | 'jump' | 'aim' | 'celebrate';

/** The hero. Uses the rigged Tripo GLB when present, a procedural stand-in otherwise. */
export class Explorer {
  readonly group = new THREE.Group();
  readonly handR = new THREE.Object3D();
  readonly handL = new THREE.Object3D();
  private body = new THREE.Group();
  private armR = new THREE.Group();
  private armL = new THREE.Group();
  private legR = new THREE.Mesh();
  private legL = new THREE.Mesh();
  private glider: THREE.Mesh;
  private glowR: THREE.Sprite;
  private glowL: THREE.Sprite;
  private packGlow!: THREE.MeshStandardMaterial;
  private t = 0;
  private mixer: THREE.AnimationMixer | null = null;
  private actions = new Map<ClipKey, THREE.AnimationAction>();
  private current: ClipKey | null = null;
  rigged = false;
  private boneR: THREE.Object3D | null = null;
  private boneL: THREE.Object3D | null = null;
  private boneArmR: THREE.Object3D | null = null;
  private boneArmL: THREE.Object3D | null = null;
  modelInfo = 'procedural';
  private packObj: THREE.Object3D | null = null;

  constructor() {
    this.buildProcedural();
    this.group.add(this.body);
    const glider = new THREE.Mesh(
      new THREE.ConeGeometry(0.9, 0.05, 3),
      new THREE.MeshStandardMaterial({ color: 0xfff6e0, roughness: 0.7, side: THREE.DoubleSide }),
    );
    glider.scale.set(1, 1, 0.55);
    glider.position.y = 1.75;
    glider.visible = false;
    this.glider = glider;
    this.group.add(glider);
    this.glowR = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('#ffae5a'), color: 0xff8a2a, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.glowL = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('#9be4ff'), color: 0x5cc8ff, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.glowR.scale.setScalar(0.35);
    this.glowL.scale.setScalar(0.35);
    this.handR.add(this.glowR);
    this.handL.add(this.glowL);
  }

  private buildProcedural() {
    const parka = new THREE.MeshStandardMaterial({ color: 0x1f8a8a, roughness: 0.75 });
    const fur = new THREE.MeshStandardMaterial({ color: 0xf3e9d8, roughness: 1 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xf0c4a0, roughness: 0.7 });
    const boot = new THREE.MeshStandardMaterial({ color: 0x3a2a24, roughness: 0.8 });
    const brass = new THREE.MeshStandardMaterial({ color: 0xd9a548, metalness: 0.9, roughness: 0.3 });
    this.packGlow = new THREE.MeshStandardMaterial({ color: 0xffa040, emissive: 0xff7a1a, emissiveIntensity: 2 });
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.3, 0.42, 6, 14), parka);
    torso.position.y = 0.72;
    torso.scale.set(1.05, 1, 0.95);
    const hem = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.06, 8, 20), fur);
    hem.rotation.x = Math.PI / 2;
    hem.position.y = 0.42;
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.27, 20, 16), parka);
    head.position.y = 1.2;
    head.scale.set(1, 1.05, 1);
    const face = new THREE.Mesh(new THREE.SphereGeometry(0.17, 16, 12), skin);
    face.position.set(0, 1.17, -0.15);
    const hood = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.07, 10, 22), fur);
    hood.position.set(0, 1.18, -0.17);
    const goggles = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.03, 8, 16), brass);
    goggles.position.set(0.1, 1.38, -0.16);
    goggles.rotation.x = 0.4;
    const goggles2 = goggles.clone();
    goggles2.position.x = -0.1;
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.42, 0.2), brass);
    pack.position.set(0, 0.8, 0.32);
    const win = new THREE.Mesh(new THREE.CircleGeometry(0.09, 16), this.packGlow);
    win.position.set(0, 0.82, 0.425);
    this.body.add(torso, hem, head, face, hood, goggles, goggles2, pack, win);
    const mkArm = (side: 1 | -1, glove: number) => {
      const g = new THREE.Group();
      g.position.set(0.34 * side, 0.92, 0);
      const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.3, 4, 10), parka);
      arm.position.y = -0.2;
      const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.035, 6, 14), fur);
      cuff.rotation.x = Math.PI / 2;
      cuff.position.y = -0.38;
      const hand = new THREE.Mesh(
        new THREE.SphereGeometry(0.13, 14, 12),
        new THREE.MeshStandardMaterial({ color: glove, roughness: 0.5, emissive: glove, emissiveIntensity: 0.35 }),
      );
      hand.position.y = -0.48;
      g.add(arm, cuff, hand);
      return { g, hand };
    };
    const r = mkArm(1, 0xff7a1a);
    const l = mkArm(-1, 0x4fc3ff);
    // The explorer faces −z, so its right hand is at +x.
    r.g.position.x = 0.34;
    l.g.position.x = -0.34;
    this.armR = r.g;
    this.armL = l.g;
    r.hand.add(this.handR);
    l.hand.add(this.handL);
    this.body.add(this.armR, this.armL);
    const mkLeg = (x: number) => {
      const m = new THREE.Mesh(new THREE.CapsuleGeometry(0.1, 0.2, 4, 10), boot);
      m.position.set(x, 0.2, 0);
      return m;
    };
    this.legR = mkLeg(0.13);
    this.legL = mkLeg(-0.13);
    this.body.add(this.legR, this.legL);
    this.body.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = true;
      }
    });
  }

  async loadModel(url: string): Promise<boolean> {
    try {
      const gltf = await new GLTFLoader().loadAsync(url);
      const root = cloneSkinned(gltf.scene);
      const box = new THREE.Box3().setFromObject(root);
      const h = box.max.y - box.min.y;
      const s = 1.4 / h;
      root.scale.setScalar(s);
      root.position.y = -box.min.y * s;
      // Tripo exports face +z; the game's forward is −z.
      root.rotation.y = Math.PI;
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
          m.castShadow = true;
          m.frustumCulled = false;
        }
        const n = o.name.toLowerCase();
        if (/right.?hand$/.test(n) && !this.boneR) this.boneR = o;
        if (/left.?hand$/.test(n) && !this.boneL) this.boneL = o;
        if (/right.?arm$/.test(n) && !this.boneArmR) this.boneArmR = o;
        if (/left.?arm$/.test(n) && !this.boneArmL) this.boneArmL = o;
      });
      this.group.remove(this.body);
      this.group.add(root);
      // the heat battery on the explorer's back, with its glowing gauge window (as in the mockups)
      const pack = new THREE.Group();
      const brass = new THREE.MeshStandardMaterial({ color: 0xd9a548, metalness: 0.9, roughness: 0.3 });
      const packBox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.36, 0.16), brass);
      const win = new THREE.Mesh(new THREE.CircleGeometry(0.085, 20), this.packGlow);
      win.position.z = 0.081;
      const rimM = new THREE.Mesh(new THREE.TorusGeometry(0.09, 0.015, 6, 20), brass);
      rimM.position.z = 0.082;
      pack.add(packBox, win, rimM);
      pack.position.set(0, 0.86, 0.2);
      pack.traverse((o) => ((o as THREE.Mesh).castShadow = true));
      this.group.add(pack);
      this.packObj = pack;
      if (this.boneR) this.boneR.add(this.handR);
      if (this.boneL) this.boneL.add(this.handL);
      // glow sprites are in bone space; undo the bone scale so they stay ~0.35 m
      const inv = 1 / s;
      this.glowR.userData.base = 0.35 * inv;
      this.glowL.userData.base = 0.35 * inv;
      if (gltf.animations.length) {
        this.mixer = new THREE.AnimationMixer(root);
        for (const clip of gltf.animations) {
          const n = clip.name.toLowerCase();
          const key: ClipKey | null = n.includes('idle')
            ? 'idle'
            : n.includes('run') || n.includes('walk')
              ? 'run'
              : n.includes('jump')
                ? 'jump'
                : n.includes('aim') || n.includes('cast') || n.includes('attack') || n.includes('shoot')
                  ? 'aim'
                  : n.includes('cheer') || n.includes('celebrat') || n.includes('victory') || n.includes('dance')
                    ? 'celebrate'
                    : null;
          if (!key || this.actions.has(key)) continue;
          // Tripo's jump clip is a loop of five hops: keep the first one
          const use = key === 'jump' && clip.duration > 1.2 ? THREE.AnimationUtils.subclip(clip, 'jump1', 0, Math.round((clip.duration / 5) * 30), 30) : clip;
          this.actions.set(key, this.mixer.clipAction(use));
        }
        if (!this.actions.has('idle') && gltf.animations[0]) this.actions.set('idle', this.mixer.clipAction(gltf.animations[0]));
        this.play('idle');
      }
      this.rigged = true;
      this.modelInfo = `tripo: ${gltf.animations.map((a) => a.name).join(', ') || 'no clips'}`;
      return true;
    } catch (e) {
      console.warn('explorer model failed, using procedural stand-in', e);
      return false;
    }
  }

  /** Adds clips from another GLB that shares the same skeleton. */
  async addClips(url: string) {
    if (!this.mixer) return;
    try {
      const gltf = await new GLTFLoader().loadAsync(url);
      for (const clip of gltf.animations) {
        const n = (clip.name + ' ' + url).toLowerCase();
        const key: ClipKey | null = n.includes('run') ? 'run' : n.includes('jump') ? 'jump' : n.includes('aim') || n.includes('cast') ? 'aim' : n.includes('celebr') || n.includes('cheer') ? 'celebrate' : n.includes('idle') ? 'idle' : null;
        if (key && !this.actions.has(key)) this.actions.set(key, this.mixer.clipAction(clip));
      }
    } catch {
      /* optional */
    }
  }

  private play(key: ClipKey) {
    const a = this.actions.get(key) ?? this.actions.get('idle');
    if (!a || this.current === key) return;
    const prev = this.current ? this.actions.get(this.current) : null;
    a.reset();
    if (key === 'jump') {
      a.setLoop(THREE.LoopOnce, 1);
      a.clampWhenFinished = true;
    }
    a.fadeIn(0.18).play();
    if (prev && prev !== a) prev.fadeOut(0.18);
    this.current = key;
  }

  update(dt: number, s: ExplorerPose, reduced: boolean) {
    this.t += dt;
    const gl = s.aiming;
    const base = this.glowR.userData.base ?? 0.35;
    const pulse = 1 + Math.sin(this.t * 14) * 0.15;
    this.glowR.scale.setScalar(base * (gl === 'heat' ? 2.2 : pulse));
    this.glowL.scale.setScalar(base * (gl === 'cold' ? 2.2 : pulse));
    this.glider.visible = s.gliding;
    if (s.gliding) this.glider.rotation.z = Math.sin(this.t * 3) * 0.08;

    if (this.mixer) {
      const key: ClipKey = s.won
        ? 'celebrate'
        : !s.onGround && !s.gliding
          ? 'jump'
          : gl && this.actions.has('aim')
            ? 'aim'
            : s.speed > 0.6
              ? 'run'
              : 'idle';
      this.play(key);
      const run = this.actions.get('run');
      if (run) run.timeScale = Math.max(0.7, s.speed / 4.2);
      this.mixer.update(dt);
      this.packGlow.emissiveIntensity = 1.5 + Math.sin(this.t * 3) * 0.4 + (gl === 'cold' ? 1.5 : 0);
      if (this.packObj) this.packObj.position.y = 0.86 + (s.speed > 0.6 && s.onGround && !reduced ? Math.abs(Math.sin(this.t * 10)) * 0.025 : 0);
      // when there is no aim clip, raise the aiming arm procedurally
      if (gl && !this.actions.has('aim')) {
        const arm = gl === 'heat' ? this.boneArmR : this.boneArmL;
        if (arm) arm.rotation.x -= 1.1;
      }
      return;
    }
    // procedural stand-in animation
    const run = Math.min(1, s.speed / 5);
    const ph = this.t * 11;
    const bob = reduced ? 0 : Math.abs(Math.sin(ph)) * 0.06 * run;
    this.body.position.y = bob + (s.splashing ? -0.4 : 0);
    this.legR.position.z = Math.sin(ph) * 0.14 * run;
    this.legL.position.z = -Math.sin(ph) * 0.14 * run;
    this.armR.rotation.x = gl === 'heat' ? -1.45 : Math.sin(ph) * 0.6 * run;
    this.armL.rotation.x = gl === 'cold' ? -1.45 : -Math.sin(ph) * 0.6 * run;
    if (!s.onGround && !s.gliding) {
      this.armR.rotation.z = 0.6;
      this.armL.rotation.z = -0.6;
    } else if (s.gliding) {
      this.armR.rotation.x = -2.9;
      this.armL.rotation.x = -2.9;
    } else {
      this.armR.rotation.z = 0;
      this.armL.rotation.z = 0;
    }
    if (s.won) {
      this.armR.rotation.x = -2.8 + Math.sin(this.t * 8) * 0.3;
      this.armL.rotation.x = -2.8 - Math.sin(this.t * 8) * 0.3;
      this.body.position.y = Math.abs(Math.sin(this.t * 6)) * 0.25;
    }
    this.packGlow.emissiveIntensity = 1.5 + Math.sin(this.t * 3) * 0.4;
  }

  handWorld(which: 'heat' | 'cold', out: THREE.Vector3) {
    (which === 'heat' ? this.handR : this.handL).getWorldPosition(out);
    return out;
  }
}
