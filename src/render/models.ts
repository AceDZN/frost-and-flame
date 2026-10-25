import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export const MODEL_FILES = ['observatory', 'balloon', 'thermo-lift', 'sun-mirror', 'plunger'] as const;
export type ModelName = (typeof MODEL_FILES)[number];

export function modelUrl(name: string) {
  return `${import.meta.env.BASE_URL}models/${name}.glb`;
}

/** Static Tripo set pieces, normalised to a 1-unit footprint with the base on y = 0. */
export class Models {
  private cache = new Map<string, THREE.Object3D>();

  async preload(onProgress?: (done: number, total: number) => void) {
    const loader = new GLTFLoader();
    let done = 0;
    await Promise.all(
      MODEL_FILES.map(async (name) => {
        try {
          const gltf = await loader.loadAsync(modelUrl(name));
          const root = gltf.scene;
          const box = new THREE.Box3().setFromObject(root);
          const size = box.getSize(new THREE.Vector3());
          const s = 1 / Math.max(size.x, size.y, size.z);
          root.scale.setScalar(s);
          const c = box.getCenter(new THREE.Vector3());
          root.position.set(-c.x * s, -box.min.y * s, -c.z * s);
          root.traverse((o) => {
            const m = o as THREE.Mesh;
            if (m.isMesh) {
              m.castShadow = true;
              m.receiveShadow = true;
            }
          });
          const wrap = new THREE.Group();
          wrap.add(root);
          this.cache.set(name, wrap);
        } catch {
          /* model not available yet: procedural fallback */
        }
        onProgress?.(++done, MODEL_FILES.length);
      }),
    );
  }

  has(name: ModelName) {
    return this.cache.has(name);
  }

  get(name: ModelName): THREE.Object3D | null {
    const m = this.cache.get(name);
    return m ? m.clone(true) : null;
  }
}
