import * as THREE from 'three';

const VERT = /* glsl */ `
attribute float size;
attribute float alpha;
attribute vec3 color;
varying float vAlpha;
varying vec3 vColor;
uniform float scale;
void main() {
  vAlpha = alpha;
  vColor = color;
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = size * scale / -mv.z;
  gl_Position = projectionMatrix * mv;
}`;

const FRAG = /* glsl */ `
uniform sampler2D map;
varying float vAlpha;
varying vec3 vColor;
void main() {
  vec4 t = texture2D(map, gl_PointCoord);
  gl_FragColor = vec4(vColor * t.rgb, t.a * vAlpha);
  if (gl_FragColor.a < 0.01) discard;
}`;

export interface SpawnOpts {
  pos: THREE.Vector3;
  vel?: THREE.Vector3;
  life?: number;
  size?: number;
  grow?: number;
  color?: THREE.Color | number;
  gravity?: number;
  drag?: number;
  /** Fly to this point over the particle's life (glove streams). */
  to?: THREE.Vector3;
  alpha?: number;
}

interface P {
  p: THREE.Vector3;
  v: THREE.Vector3;
  from?: THREE.Vector3;
  to?: THREE.Vector3;
  wobble: number;
  age: number;
  life: number;
  size: number;
  grow: number;
  c: THREE.Color;
  g: number;
  drag: number;
  a: number;
}

export class Particles {
  readonly points: THREE.Points;
  private list: P[] = [];
  private geo: THREE.BufferGeometry;
  private pos: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private col: Float32Array;
  private mat: THREE.ShaderMaterial;
  enabled = true;

  constructor(
    private max: number,
    map: THREE.Texture,
    additive: boolean,
  ) {
    this.geo = new THREE.BufferGeometry();
    this.pos = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.col = new Float32Array(max * 3);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geo.setAttribute('size', new THREE.BufferAttribute(this.size, 1));
    this.geo.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1));
    this.geo.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.mat = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: { map: { value: map }, scale: { value: 500 } },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 5 : 4;
  }

  setViewport(h: number) {
    this.mat.uniforms.scale.value = h * 0.9;
  }

  spawn(o: SpawnOpts) {
    if (!this.enabled) return;
    if (this.list.length >= this.max) this.list.shift();
    this.list.push({
      p: o.pos.clone(),
      v: o.vel ? o.vel.clone() : new THREE.Vector3(),
      from: o.to ? o.pos.clone() : undefined,
      to: o.to?.clone(),
      wobble: Math.random() * 6.28,
      age: 0,
      life: o.life ?? 1,
      size: o.size ?? 0.3,
      grow: o.grow ?? 0,
      c: new THREE.Color(o.color ?? 0xffffff),
      g: o.gravity ?? 0,
      drag: o.drag ?? 0,
      a: o.alpha ?? 1,
    });
  }

  clear() {
    this.list = [];
  }

  update(dt: number) {
    const keep: P[] = [];
    for (const q of this.list) {
      q.age += dt;
      if (q.age >= q.life) continue;
      if (q.to && q.from) {
        const t = q.age / q.life;
        const e = t * t * (3 - 2 * t);
        q.p.lerpVectors(q.from, q.to, e);
        const side = Math.sin(t * Math.PI) * 0.25;
        q.p.x += Math.sin(q.wobble + t * 12) * side;
        q.p.y += Math.cos(q.wobble + t * 9) * side;
      } else {
        q.v.y += q.g * dt;
        q.v.multiplyScalar(Math.max(0, 1 - q.drag * dt));
        q.p.addScaledVector(q.v, dt);
      }
      keep.push(q);
    }
    this.list = keep;
    const n = keep.length;
    for (let i = 0; i < n; i++) {
      const q = keep[i];
      const t = q.age / q.life;
      this.pos[i * 3] = q.p.x;
      this.pos[i * 3 + 1] = q.p.y;
      this.pos[i * 3 + 2] = q.p.z;
      this.size[i] = q.size * (1 + q.grow * t);
      this.alpha[i] = q.a * Math.min(1, t * 6) * (1 - t);
      this.col[i * 3] = q.c.r;
      this.col[i * 3 + 1] = q.c.g;
      this.col[i * 3 + 2] = q.c.b;
    }
    this.geo.setDrawRange(0, n);
    (this.geo.attributes.position as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.size as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.alpha as THREE.BufferAttribute).needsUpdate = true;
    (this.geo.attributes.color as THREE.BufferAttribute).needsUpdate = true;
  }
}
