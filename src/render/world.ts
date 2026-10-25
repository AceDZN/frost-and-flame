import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { glowSprite, rockTexture, snowTexture } from './textures';

const SKY_VERT = /* glsl */ `
varying vec3 vDir;
void main() {
  vDir = normalize((modelMatrix * vec4(position, 1.0)).xyz - cameraPosition);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  gl_Position.z = gl_Position.w;
}`;

const SKY_FRAG = /* glsl */ `
varying vec3 vDir;
uniform vec3 sunDir;
void main() {
  vec3 d = normalize(vDir);
  float h = d.y;
  vec3 top = vec3(0.13, 0.11, 0.33);
  vec3 mid = vec3(0.42, 0.30, 0.62);
  vec3 hor = vec3(1.0, 0.56, 0.32);
  vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, h));
  col = mix(col, top, smoothstep(0.2, 0.75, h));
  float s = max(dot(d, normalize(sunDir)), 0.0);
  col += vec3(1.0, 0.62, 0.25) * pow(s, 8.0) * 0.55;
  col += vec3(1.0, 0.85, 0.55) * pow(s, 400.0) * 3.0;
  // soft cloud bands
  float band = sin(d.x * 9.0 + d.z * 4.0) * sin(h * 38.0 + d.x * 3.0);
  col += vec3(1.0, 0.6, 0.55) * smoothstep(0.6, 1.0, band) * 0.08 * smoothstep(0.02, 0.25, h) * (1.0 - smoothstep(0.35, 0.6, h));
  col = mix(col, vec3(0.16, 0.13, 0.30), smoothstep(0.0, -0.25, h));
  gl_FragColor = vec4(col, 1.0);
}`;

export interface World {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  sun: THREE.DirectionalLight;
  sunDir: THREE.Vector3;
  levelRoot: THREE.Group;
  mats: Record<string, THREE.Material>;
  resize: () => void;
  updateShadow: (target: THREE.Vector3) => void;
}

export function createWorld(canvas: HTMLCanvasElement): World {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  scene.fog = new THREE.Fog(0x8a5f8e, 28, 95);
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;

  const camera = new THREE.PerspectiveCamera(52, 1, 0.1, 400);
  camera.position.set(0, 5, 10);

  const sunDir = new THREE.Vector3(0.75, 0.22, -0.62).normalize();
  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(300, 32, 16),
    new THREE.ShaderMaterial({ vertexShader: SKY_VERT, fragmentShader: SKY_FRAG, uniforms: { sunDir: { value: sunDir } }, side: THREE.BackSide, depthWrite: false, fog: false }),
  );
  sky.renderOrder = -10;
  scene.add(sky);

  scene.add(new THREE.HemisphereLight(0x9fa8ff, 0x2a2440, 0.85));
  const sun = new THREE.DirectionalLight(0xffb37a, 2.6);
  sun.position.copy(sunDir).multiplyScalar(40);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  const sc = sun.shadow.camera;
  sc.left = -18;
  sc.right = 18;
  sc.top = 18;
  sc.bottom = -18;
  sc.near = 1;
  sc.far = 90;
  sun.shadow.bias = -0.0006;
  sun.shadow.normalBias = 0.03;
  scene.add(sun);
  scene.add(sun.target);
  const fill = new THREE.DirectionalLight(0x7f8cff, 0.5);
  fill.position.set(-20, 18, 20);
  scene.add(fill);

  const rockTex = rockTexture();
  const snowTex = snowTexture();
  const mats: Record<string, THREE.Material> = {
    basalt: new THREE.MeshStandardMaterial({ color: 0x55525e, map: rockTex, roughness: 0.82, metalness: 0.05, flatShading: true }),
    snow: new THREE.MeshStandardMaterial({ color: 0xf2f6ff, map: snowTex, roughness: 0.75 }),
    stone: new THREE.MeshStandardMaterial({ color: 0x7a7280, map: rockTex, roughness: 0.8, flatShading: true }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd9a548, metalness: 0.92, roughness: 0.32 }),
    copper: new THREE.MeshStandardMaterial({ color: 0xc8703f, metalness: 0.9, roughness: 0.3 }),
    iron: new THREE.MeshStandardMaterial({ color: 0x5d6168, metalness: 0.8, roughness: 0.45 }),
    wood: new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.8 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0xbfe8ff, roughness: 0.05, metalness: 0, transparent: true, opacity: 0.22, depthWrite: false, clearcoat: 1, side: THREE.DoubleSide }),
    dark: new THREE.MeshStandardMaterial({ color: 0x1f1d24, roughness: 0.9, flatShading: true }),
  };

  // distant sea, islets and a lighthouse on the horizon
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 600),
    new THREE.MeshStandardMaterial({ color: 0x27244a, roughness: 0.25, metalness: 0.4 }),
  );
  sea.rotation.x = -Math.PI / 2;
  sea.position.y = -4.5;
  scene.add(sea);
  const glint = new THREE.Mesh(
    new THREE.PlaneGeometry(14, 120),
    new THREE.MeshBasicMaterial({ color: 0xffa060, transparent: true, opacity: 0.22, depthWrite: false, blending: THREE.AdditiveBlending }),
  );
  glint.rotation.x = -Math.PI / 2;
  glint.rotation.z = Math.atan2(sunDir.x, -sunDir.z);
  glint.position.set(sunDir.x * 80, -4.4, sunDir.z * 80);
  scene.add(glint);
  const backdrop = new THREE.Group();
  const isletGeo = new THREE.DodecahedronGeometry(1, 1);
  const rnd = (() => {
    let s = 42;
    return () => ((s = (s * 16807) % 2147483647) / 2147483647);
  })();
  for (let i = 0; i < 26; i++) {
    const a = rnd() * Math.PI * 2;
    const r = 55 + rnd() * 70;
    const m = new THREE.Mesh(isletGeo, mats.basalt);
    const s = 3 + rnd() * 9;
    m.scale.set(s * (1 + rnd()), s * (0.5 + rnd() * 0.9), s);
    m.position.set(Math.cos(a) * r, -4.5, Math.sin(a) * r);
    m.rotation.y = rnd() * 6;
    backdrop.add(m);
    const cap = new THREE.Mesh(isletGeo, mats.snow);
    cap.scale.copy(m.scale).multiplyScalar(0.92);
    cap.position.copy(m.position).add(new THREE.Vector3(0, m.scale.y * 0.25, 0));
    cap.rotation.copy(m.rotation);
    backdrop.add(cap);
  }
  // horizon lighthouse toward the sun
  const lh = new THREE.Group();
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 1.2, 7, 12), new THREE.MeshStandardMaterial({ color: 0xf2ece4, roughness: 0.6 }));
  tower.position.y = 3.5;
  lh.add(tower);
  const lamp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowSprite('#ffd38a'), color: 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  lamp.scale.set(9, 9, 1);
  lamp.position.y = 7.6;
  lh.add(lamp);
  const rock = new THREE.Mesh(isletGeo, mats.basalt);
  rock.scale.set(9, 4, 7);
  lh.add(rock);
  lh.position.set(sunDir.x * 70, -3, sunDir.z * 70 - 10);
  backdrop.add(lh);
  scene.add(backdrop);

  const levelRoot = new THREE.Group();
  scene.add(levelRoot);

  const resize = () => {
    const el = canvas.parentElement!;
    const w = el.clientWidth;
    const h = el.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.fov = w / h < 0.8 ? 68 : 52;
    camera.updateProjectionMatrix();
  };

  const updateShadow = (t: THREE.Vector3) => {
    sun.target.position.copy(t);
    sun.position.copy(t).addScaledVector(sunDir, 40);
    backdrop.position.set(t.x * 0.6, 0, t.z * 0.6);
  };

  return { renderer, scene, camera, sun, sunDir, levelRoot, mats, resize, updateShadow };
}
